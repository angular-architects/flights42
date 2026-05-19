import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { readBridge } from '../../../../libs/ag-ui-server/step-bridge.js';
import { hotelSchema } from '../tools/find-hotels.js';
import { flightSchema, searchFlights } from '../tools/search-flights.js';

const packageInputSchema = z.object({
  from: z.string().describe('Departure city (name, not IATA code).'),
  to: z.string().describe('Destination city (name, not IATA code).'),
  stops: z
    .array(z.string())
    .default([])
    .describe(
      'Intermediate stop cities on the OUTBOUND journey, in travel order between from and to.',
    ),
  returnStops: z
    .array(z.string())
    .default([])
    .describe(
      'Intermediate stop cities on the RETURN journey, in travel order between to and from.',
    ),
  departDate: z
    .string()
    .describe('Planned outbound departure date (ISO 8601, e.g. 2026-05-15).'),
  returnDate: z
    .string()
    .describe('Planned return flight date (ISO 8601, e.g. 2026-05-22).'),
});

const legSchema = z.object({
  from: z.string(),
  to: z.string(),
  candidates: z.array(flightSchema),
});

const destinationSchema = z.object({
  city: z.string(),
  hotels: z.array(hotelSchema),
});

const packageOutputSchema = z.object({
  legs: z.array(legSchema),
  destinations: z.array(destinationSchema),
});

interface StepProgressContext {
  writer?: { write: (chunk: unknown) => Promise<void> };
  requestContext?: Parameters<typeof readBridge>[0];
  /**
   * Name of the surrounding workflow step. Forwarded onto every bridge tool
   * call so the client can group calls under their parent step.
   */
  stepName?: string;
}

async function emitStepStatus(
  ctx: StepProgressContext,
  stepName: string,
  status: 'started' | 'finished',
  extras?: Record<string, unknown>,
): Promise<void> {
  // Primary path: per-request bridge stored on RequestContext by the AG-UI
  // adapter. This bypasses Mastra's tool-stream pipe entirely and is reliably
  // delivered even when the workflow is invoked as a sub-tool of an agent.
  const bridge = readBridge(ctx.requestContext);
  bridge?.emit({ stepName, kind: status, details: extras });

  // Secondary path: also push a custom chunk into the workflow's stream so
  // any consumer that DOES receive the piped output sees the progress too.
  // The `data-` prefix is Mastra's reserved namespace for custom chunks.
  await ctx.writer?.write({
    type: 'data-step-status',
    stepName,
    status,
    ...(extras ?? {}),
  });
}

/**
 * Surface a synchronous "I just called X with these args, here's the result"
 * event to the AG-UI client as a regular tool call. Useful for exposing work
 * that happens inside a workflow step (direct service calls, sub-agent
 * invocations) so the UI's Tool-Calls list reflects the full picture.
 */
async function withToolCall<T>(
  ctx: StepProgressContext,
  toolName: string,
  args: unknown,
  run: () => Promise<T>,
): Promise<T> {
  const bridge = readBridge(ctx.requestContext);
  const result = await run();
  bridge?.emitToolCall({
    toolName,
    args,
    result,
    stepName: ctx.stepName,
  });
  return result;
}

const findFlightsStep = createStep({
  id: 'findFlights',
  description:
    'Searches for flights for all legs of the trip (outbound and return, including stops) using parallel requests.',
  inputSchema: packageInputSchema,
  outputSchema: z.object({ legs: z.array(legSchema) }),
  execute: async ({ inputData, writer, requestContext }) => {
    const ctx: StepProgressContext = {
      writer,
      requestContext,
      stepName: 'findFlights',
    };
    await emitStepStatus(ctx, 'findFlights', 'started');

    const { from, to, stops, returnStops } = inputData;
    const citySequence = [from, ...stops, to, ...returnStops, from];
    const legPairs = citySequence
      .slice(0, -1)
      .map((city, i) => ({ from: city, to: citySequence[i + 1] }));

    const legs = await Promise.all(
      legPairs.map(async (pair) => {
        const candidates = await withToolCall(
          ctx,
          'searchFlights',
          { from: pair.from, to: pair.to },
          () => searchFlights(pair.from, pair.to),
        );
        return { from: pair.from, to: pair.to, candidates };
      }),
    );

    await emitStepStatus(ctx, 'findFlights', 'finished', {
      legCount: legs.length,
    });
    return { legs };
  },
});

const findHotelsStep = createStep({
  id: 'findHotels',
  description:
    'Asks the hotel agent for hotel options in all destination cities (stops + final destination) using parallel requests.',
  inputSchema: z.object({ legs: z.array(legSchema) }),
  outputSchema: z.object({
    legs: z.array(legSchema),
    destinations: z.array(destinationSchema),
  }),
  execute: async ({
    inputData,
    getInitData,
    mastra,
    writer,
    requestContext,
  }) => {
    const ctx: StepProgressContext = {
      writer,
      requestContext,
      stepName: 'findHotels',
    };
    await emitStepStatus(ctx, 'findHotels', 'started');

    const init = getInitData<z.infer<typeof packageInputSchema>>();
    const cities = [...init.stops, init.to, ...init.returnStops];
    const bridge = readBridge(requestContext);
    const agent = mastra.getAgent('hotelAgent');

    const agentOutputSchema = z.object({
      city: z.string(),
      hotels: z.array(hotelSchema),
    });

    const destinations = await Promise.all(
      cities.map(async (city) => {
        const result = await agent.generate(
          [{ role: 'user', content: `Find hotels in ${city}.` }],
          { structuredOutput: { schema: agentOutputSchema } },
        );

        const hotelData = result.object ?? { city, hotels: [] };

        bridge?.emitToolCall({
          toolName: 'agent-hotelAgent',
          args: { city },
          result: hotelData,
          stepName: ctx.stepName,
        });

        return { city, hotels: hotelData.hotels };
      }),
    );

    await emitStepStatus(ctx, 'findHotels', 'finished', {
      cityCount: destinations.length,
    });
    return { legs: inputData.legs, destinations };
  },
});

const finalizeStep = createStep({
  id: 'finalize',
  description:
    'Passes the combined legs and destinations through as the final workflow output.',
  inputSchema: packageOutputSchema,
  outputSchema: packageOutputSchema,
  execute: async ({ inputData, writer, requestContext }) => {
    const ctx: StepProgressContext = { writer, requestContext };
    await emitStepStatus(ctx, 'finalize', 'started');
    await emitStepStatus(ctx, 'finalize', 'finished');
    return inputData;
  },
});

export const packageTourWorkflow = createWorkflow({
  id: 'packageTourWorkflow',
  description:
    'Proposes a multi-stop package tour: searches flights for all legs, then finds hotels for all destination cities, then finalizes the result.',
  inputSchema: packageInputSchema,
  outputSchema: packageOutputSchema,
})
  .then(findFlightsStep)
  .then(findHotelsStep)
  .then(finalizeStep)
  .commit();
