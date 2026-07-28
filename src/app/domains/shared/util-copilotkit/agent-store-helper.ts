import { randomUUID } from '@ag-ui/client';
import { type UserMessage } from '@ag-ui/core';
import { type Signal } from '@angular/core';
import { type AgentStore, CopilotKit, type Message } from '@copilotkit/angular';

import { AppHttpAgent } from './app-http-agent';

export type SendMessageInput = string | UserMessage['content'];

export function getAgentMessages(
  store: Signal<AgentStore>,
  agentId: string,
): Message[] {
  return store()
    .messages()
    .filter(
      (message) => message.role !== 'developer' && message.role !== 'system',
    )
    .map((message) => ({ ...message, agentId }) as unknown as Message);
}

export async function sendMessage(
  copilotKit: CopilotKit,
  store: Signal<AgentStore>,
  input: SendMessageInput,
  forwardProps?: Record<string, unknown>,
): Promise<void> {
  const agent = store().agent;
  agent.addMessage({ id: randomUUID(), role: 'user', content: input });
  await copilotKit.core.runAgent({ agent, forwardedProps: forwardProps });
}

export async function sendDeveloperMessage(
  copilotKit: CopilotKit,
  store: Signal<AgentStore>,
  content: string,
  forwardProps?: Record<string, unknown>,
): Promise<void> {
  const agent = store().agent;
  agent.addMessage({ id: randomUUID(), role: 'developer', content });
  await copilotKit.core.runAgent({ agent, forwardedProps: forwardProps });
}

export function addDeveloperMessage(
  store: Signal<AgentStore>,
  content: string,
): void {
  store().agent.addMessage({ id: randomUUID(), role: 'developer', content });
}

export function stop(store: Signal<AgentStore>): void {
  store().agent.abortRun();
}

export function reset(store: Signal<AgentStore>): void {
  const agent = store().agent;
  agent.abortRun();
  agent.messages = [];
  agent.threadId = randomUUID();
  if (agent instanceof AppHttpAgent) {
    agent.clearSentHistory();
  }
}
