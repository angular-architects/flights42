import { z } from 'zod';

import { AgUiClientToolDefinition } from '../../../shared/ui-agent/ag-ui-types';

const flightSchema = z
  .object({
    id: z.number().describe('The flight id'),
    from: z.string().describe('Departure city'),
    to: z.string().describe('Arrival city'),
    date: z.string().describe('Departure date in ISO format'),
    delay: z.number().describe('Delay in minutes'),
  })
  .strict();

const messageWidgetComponentSchema = z
  .object({
    name: z.literal('messageWidget'),
    params: z
      .object({
        data: z
          .string()
          .describe('Plain text or markdown to display to the user.'),
      })
      .strict(),
  })
  .strict();

const flightWidgetComponentSchema = z
  .object({
    name: z.literal('flightWidget'),
    params: z
      .object({
        flight: flightSchema,
        status: z.enum(['booked', 'other']).describe('Status of the flight'),
      })
      .strict(),
  })
  .strict();

const componentSchema = z.discriminatedUnion('name', [
  messageWidgetComponentSchema,
  flightWidgetComponentSchema,
]);

const showComponentInputSchema = z
  .object({
    component: componentSchema.describe(
      'Component config with name discriminator and params.',
    ),
  })
  .strict();

export function createShowComponentTool(): AgUiClientToolDefinition {
  return {
    name: 'showComponent',
    description:
      'Render a UI component for the user. Use this for messageWidget and flightWidget output.',
    parameters: z.toJSONSchema(showComponentInputSchema),
    execute: (args) => {
      const value = showComponentInputSchema.parse(args);

      return {
        name: value.component.name,
        props: value.component.params,
      };
    },
  };
}
