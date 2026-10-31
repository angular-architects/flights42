import {
  type AbstractAgent,
  type BaseEvent,
  EventType,
  type RunAgentInput,
  type RunFinishedEvent,
  type ToolCallResultEvent,
  type ToolCallStartEvent,
} from '@ag-ui/client';
import { isValidationError } from '@mastra/core/tools';

import { MODEL_ID } from '../config.js';
import type { SseWriter } from './route-utils.js';

export interface CreateAgUiEventStreamOptions {
  onEvent?: (
    event: BaseEvent,
  ) => Promise<readonly BaseEvent[] | void> | readonly BaseEvent[] | void;
}

interface RunTracking {
  started: number;
  clientTools: Set<string>;
  openToolCalls: Set<string>;
}

export async function streamAgentEvents(
  sse: SseWriter,
  agent: AbstractAgent,
  input: RunAgentInput,
  options: CreateAgUiEventStreamOptions = {},
): Promise<void> {
  const tracking: RunTracking = {
    started: Date.now(),
    clientTools: new Set(input.tools.map((tool) => tool.name)),
    openToolCalls: new Set(),
  };

  let runErrorSent = false;
  const send = async (event: BaseEvent): Promise<void> => {
    if (runErrorSent) {
      return;
    }
    if (event.type === EventType.RUN_ERROR) {
      runErrorSent = true;
    }
    return sse.writeSSE({ data: JSON.stringify(event) });
  };

  try {
    await agent.runAgent(input, {
      onEvent: async ({ event }) => {
        trackToolCall(event, tracking);
        await send(withRunResult(event, tracking));
        for (const extra of (await options.onEvent?.(event)) ?? []) {
          await send(extra);
        }
      },
    });
  } catch (err) {
    if (runErrorSent) {
      return;
    }
    await send({
      type: EventType.RUN_ERROR,
      message: err instanceof Error ? err.message : String(err),
      code: 'run_error',
    } as BaseEvent).catch(() => undefined);
  }
}

function trackToolCall(event: BaseEvent, tracking: RunTracking): void {
  if (isToolCallStart(event) && !tracking.clientTools.has(event.toolCallName)) {
    tracking.openToolCalls.add(event.toolCallId);
  }
  if (isToolCallResult(event) && !isFailedResult(event)) {
    tracking.openToolCalls.delete(event.toolCallId);
  }
}

function withRunResult(event: BaseEvent, tracking: RunTracking): BaseEvent {
  if (!isRunFinished(event)) {
    return event;
  }
  const interrupted = interruptedToolCalls(event);
  const failed = [...tracking.openToolCalls].filter(
    (id) => !interrupted.has(id),
  );
  const result = {
    ...(event.result as object | undefined),
    model: MODEL_ID,
    durationMs: Date.now() - tracking.started,
    failedToolCalls: failed.length,
  };
  return { ...event, result } as BaseEvent;
}

function interruptedToolCalls(
  event: RunFinishedEvent,
): Set<string | undefined> {
  const interrupts =
    event.outcome?.type === 'interrupt' ? event.outcome.interrupts : [];
  return new Set(interrupts.map((interrupt) => interrupt.toolCallId));
}

function isFailedResult(event: ToolCallResultEvent): boolean {
  if (typeof event.content !== 'string') {
    return false;
  }
  try {
    return isValidationError(JSON.parse(event.content));
  } catch {
    return false;
  }
}

function isToolCallStart(event: BaseEvent): event is ToolCallStartEvent {
  return event.type === EventType.TOOL_CALL_START;
}

function isToolCallResult(event: BaseEvent): event is ToolCallResultEvent {
  return event.type === EventType.TOOL_CALL_RESULT;
}

function isRunFinished(event: BaseEvent): event is RunFinishedEvent {
  return event.type === EventType.RUN_FINISHED;
}
