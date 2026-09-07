import {
  type AbstractAgent,
  type BaseEvent,
  EventType,
  type RunAgentInput,
} from '@ag-ui/client';
import { from, lastValueFrom, toArray } from 'rxjs';

import { ResumedToolCallMiddleware } from './agent-middlewares';

const INTERRUPT_ID = 'run-1::call-1';

function input(overrides: Partial<RunAgentInput> = {}): RunAgentInput {
  return {
    threadId: 'thread-1',
    runId: 'run-x',
    messages: [],
    tools: [],
    context: [],
    forwardedProps: {},
    state: undefined,
    ...overrides,
  } as RunAgentInput;
}

function runWith(
  middleware: ResumedToolCallMiddleware,
  runInput: RunAgentInput,
  events: BaseEvent[],
): Promise<BaseEvent[]> {
  const next = { run: () => from(events) } as unknown as AbstractAgent;
  return lastValueFrom(middleware.run(runInput, next).pipe(toArray()));
}

const suspendedRun: BaseEvent[] = [
  { type: EventType.RUN_STARTED, threadId: 'thread-1', runId: 'run-1' },
  {
    type: EventType.RUN_FINISHED,
    threadId: 'thread-1',
    runId: 'run-1',
    outcome: {
      type: 'interrupt',
      interrupts: [
        {
          id: INTERRUPT_ID,
          reason: 'mastra:tool_suspend',
          toolCallId: 'call-1',
          metadata: {
            mastra: { toolName: 'bookFlightTool', args: { flightId: 7 } },
          },
        },
      ],
    },
  },
] as BaseEvent[];

const resumedRun: BaseEvent[] = [
  { type: EventType.RUN_STARTED, threadId: 'thread-1', runId: 'run-2' },
  {
    type: EventType.TOOL_CALL_RESULT,
    messageId: 'm-1',
    toolCallId: 'call-1',
    content: '{"ok":true}',
    role: 'tool',
  },
  { type: EventType.RUN_FINISHED, threadId: 'thread-1', runId: 'run-2' },
] as BaseEvent[];

describe('ResumedToolCallMiddleware', () => {
  it('replays the suspended tool call before its result on resume', async () => {
    const middleware = new ResumedToolCallMiddleware();
    await runWith(middleware, input(), suspendedRun);

    const events = await runWith(
      middleware,
      input({
        resume: [
          { interruptId: INTERRUPT_ID, status: 'resolved', payload: {} },
        ],
      }),
      resumedRun,
    );

    expect(events.map((event) => event.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.TOOL_CALL_START,
      EventType.TOOL_CALL_ARGS,
      EventType.TOOL_CALL_END,
      EventType.TOOL_CALL_RESULT,
      EventType.RUN_FINISHED,
    ]);
    const start = events[1] as BaseEvent & {
      toolCallName: string;
      parentMessageId: string;
    };
    const args = events[2] as BaseEvent & { delta: string };
    expect(start.toolCallName).toBe('bookFlightTool');
    expect(start.parentMessageId).toBeTruthy();
    expect(JSON.parse(args.delta)).toEqual({ flightId: 7 });
  });

  it('leaves the result alone when the interrupt was cancelled', async () => {
    const middleware = new ResumedToolCallMiddleware();
    await runWith(middleware, input(), suspendedRun);

    const events = await runWith(
      middleware,
      input({
        resume: [{ interruptId: INTERRUPT_ID, status: 'cancelled' }],
      }),
      resumedRun,
    );

    expect(events.map((event) => event.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.TOOL_CALL_RESULT,
      EventType.RUN_FINISHED,
    ]);
  });

  it('passes results of unknown tool calls through unchanged', async () => {
    const middleware = new ResumedToolCallMiddleware();

    const events = await runWith(middleware, input(), resumedRun);

    expect(events).toEqual(resumedRun);
  });
});
