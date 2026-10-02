import {
  type AbstractAgent,
  type BaseEvent,
  EventType,
  type RunAgentInput,
} from '@ag-ui/client';

import type { SseWriter } from './route-utils.js';

export interface CreateAgUiEventStreamOptions {
  onEvent?: (
    event: BaseEvent,
  ) => Promise<readonly BaseEvent[] | void> | readonly BaseEvent[] | void;
}

export async function streamAgentEvents(
  sse: SseWriter,
  agent: AbstractAgent,
  input: RunAgentInput,
  options: CreateAgUiEventStreamOptions = {},
): Promise<void> {
  const send = (event: BaseEvent): Promise<void> =>
    sse.writeSSE({ data: JSON.stringify(event) });

  try {
    await agent.runAgent(input, {
      onEvent: async ({ event }) => {
        await send(event);
        for (const extra of (await options.onEvent?.(event)) ?? []) {
          await send(extra);
        }
      },
    });
  } catch (err) {
    await send({
      type: EventType.RUN_ERROR,
      message: err instanceof Error ? err.message : String(err),
      code: 'run_error',
    } as BaseEvent).catch(() => undefined);
  }
}
