import {
  type BaseEvent,
  EventType,
  type RunFinishedEvent,
  type RunStartedEvent,
  type TextMessageContentEvent,
  type TextMessageEndEvent,
  type TextMessageStartEvent,
  type ToolCallArgsEvent,
  type ToolCallEndEvent,
  type ToolCallStartEvent,
} from '@ag-ui/core';

export interface AssistantTextRunOptions {
  threadId: string;
  runId: string;
  messageId: string;
  text: string;
}

export function assistantTextRun(
  options: AssistantTextRunOptions,
): BaseEvent[] {
  const { threadId, runId, messageId, text } = options;

  const runStarted: RunStartedEvent = {
    type: EventType.RUN_STARTED,
    threadId,
    runId,
  };
  const start: TextMessageStartEvent = {
    type: EventType.TEXT_MESSAGE_START,
    messageId,
    role: 'assistant',
  };
  const content: TextMessageContentEvent = {
    type: EventType.TEXT_MESSAGE_CONTENT,
    messageId,
    delta: text,
  };
  const end: TextMessageEndEvent = {
    type: EventType.TEXT_MESSAGE_END,
    messageId,
  };
  const runFinished: RunFinishedEvent = {
    type: EventType.RUN_FINISHED,
    threadId,
    runId,
  };

  return [runStarted, start, content, end, runFinished];
}

export interface AssistantToolCallRunOptions {
  threadId: string;
  runId: string;
  messageId: string;
  toolCallId: string;
  toolName: string;
  args: unknown;
}

export function assistantToolCallRun(
  options: AssistantToolCallRunOptions,
): BaseEvent[] {
  const { threadId, runId, messageId, toolCallId, toolName, args } = options;

  const runStarted: RunStartedEvent = {
    type: EventType.RUN_STARTED,
    threadId,
    runId,
  };
  const toolStart: ToolCallStartEvent = {
    type: EventType.TOOL_CALL_START,
    toolCallId,
    toolCallName: toolName,
    parentMessageId: messageId,
  };
  const toolArgs: ToolCallArgsEvent = {
    type: EventType.TOOL_CALL_ARGS,
    toolCallId,
    delta: JSON.stringify(args),
  };
  const toolEnd: ToolCallEndEvent = {
    type: EventType.TOOL_CALL_END,
    toolCallId,
  };
  const runFinished: RunFinishedEvent = {
    type: EventType.RUN_FINISHED,
    threadId,
    runId,
  };

  return [runStarted, toolStart, toolArgs, toolEnd, runFinished];
}

export function encodeAguiSse(events: readonly BaseEvent[]): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
}

export function aguiSseResponse(events: readonly BaseEvent[]): Response {
  const payload = new TextEncoder().encode(encodeAguiSse(events));

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(payload);
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
