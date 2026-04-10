import { AgentSubscriber, HttpAgent, randomUUID } from '@ag-ui/client';

import { title } from './utils.js';

const threadId = '4711';
const url = 'http://localhost:3331/agent';

const agent = new HttpAgent({ url, threadId });

const subscriber: AgentSubscriber = {
  onRunStartedEvent: ({ event }) => {
    console.log(
      `${title('▶ RUN_STARTED')}\nthreadId=${event.threadId}\nrunId=${event.runId}`,
    );
    console.log();
  },
  onTextMessageStartEvent: ({ event }) => {
    console.log(
      `${title('▶ TEXT_MESSAGE_START')}\nmessageId=${event.messageId}\nrole=${event.role}`,
    );
    console.log();
  },
  onTextMessageContentEvent: ({ event }) => {
    console.log(
      `${title('▶ TEXT_MESSAGE_CONTENT')}\nmessageId=${event.messageId}\ndelta="${event.delta}"`,
    );
    console.log();
  },
  onTextMessageEndEvent: ({ event }) => {
    console.log(`${title('▶ TEXT_MESSAGE_END')}\nmessageId=${event.messageId}`);
    console.log();
  },
  onToolCallStartEvent: ({ event }) => {
    console.log(
      `${title('▶ TOOL_CALL_START')}\nname=${event.toolCallName}\nid=${event.toolCallId}`,
    );
    console.log();
  },
  onToolCallArgsEvent: ({ event }) => {
    const delta = JSON.stringify(JSON.parse(event.delta), undefined, 2);
    console.log(
      `${title('▶ TOOL_CALL_ARGS')}\nid=${event.toolCallId}\ndelta=${delta}`,
    );
    console.log();
  },
  onToolCallEndEvent: ({ event, toolCallArgs }) => {
    console.log(
      `${title('▶ TOOL_CALL_END')}\nid=${event.toolCallId}\nargs=${JSON.stringify(toolCallArgs, undefined, 2)}`,
    );
    console.log();
  },
  onToolCallResultEvent: ({ event }) => {
    const content = JSON.parse(event.content);
    console.log(
      `${title('▶ TOOL_CALL_RESULT')}\nid=${event.toolCallId}\nrole=${event.role}\ncontent=${JSON.stringify(content, undefined, 2)}`,
    );
    console.log();
  },
  onRunFinishedEvent: ({ event }) => {
    console.log(
      `${title('■ RUN_FINISHED')}\nthreadId=${event.threadId}\nrunId=${event.runId}`,
    );
    console.log();
  },
};

const userMessage = {
  id: randomUUID(),
  role: 'user' as const,
  content: 'What is the flight weather in Frankfurt?',
};

// The user message is not an event but part of the request's payload.
console.log(
  `${title('USER REQUEST')}\nrole=${userMessage.role}\ncontent="${userMessage.content}\n"`,
);

agent.addMessage(userMessage);

agent
  .runAgent({ runId: randomUUID() }, subscriber)
  .catch((err) => console.error('Agent error:', err));
