import { buildResumeArray, randomUUID } from '@ag-ui/client';
import { type Interrupt, type UserMessage } from '@ag-ui/core';
import { type Signal } from '@angular/core';
import { type AgentStore, CopilotKit, type Message } from '@copilotkit/angular';

import { ServerMemoryHttpAgent } from './server-memory-http-agent';

export type CopilotAgentStore = Signal<AgentStore>;

export type SendMessageInput = string | UserMessage['content'];

export function getAgentMessages(
  store: CopilotAgentStore,
  agentId: string,
): Message[] {
  return store()
    .messages()
    .filter(
      (message) => message.role !== 'developer' && message.role !== 'system',
    )
    .map((message) => ({ ...message, agentId }) as unknown as Message);
}

export function getPendingInterrupts(store: CopilotAgentStore): Interrupt[] {
  store().isRunning();
  store().messages();
  return store().agent.pendingInterrupts ?? [];
}

export async function sendMessage(
  copilotKit: CopilotKit,
  store: CopilotAgentStore,
  input: SendMessageInput,
  forwardProps?: Record<string, unknown>,
): Promise<void> {
  const agent = store().agent;
  agent.addMessage({ id: randomUUID(), role: 'user', content: input });
  await copilotKit.core.runAgent({ agent, forwardedProps: forwardProps });
}

export async function sendDeveloperMessage(
  copilotKit: CopilotKit,
  store: CopilotAgentStore,
  content: string,
  forwardProps?: Record<string, unknown>,
): Promise<void> {
  const agent = store().agent;
  agent.addMessage({ id: randomUUID(), role: 'developer', content });
  await copilotKit.core.runAgent({ agent, forwardedProps: forwardProps });
}

export function addDeveloperMessage(
  store: CopilotAgentStore,
  content: string,
): void {
  store().agent.addMessage({ id: randomUUID(), role: 'developer', content });
}

export type InterruptResponses = Parameters<typeof buildResumeArray>[1];

export async function resumeInterrupt(
  copilotKit: CopilotKit,
  store: CopilotAgentStore,
  responses: InterruptResponses,
  forwardProps?: Record<string, unknown>,
): Promise<void> {
  const agent = store().agent;
  const interrupts = agent.pendingInterrupts ?? [];

  await copilotKit.core.runAgent({
    agent,
    resume: buildResumeArray(interrupts, responses),
    forwardedProps: forwardProps,
  });
}

export function stop(store: CopilotAgentStore): void {
  store().agent.abortRun();
}

export function reset(store: CopilotAgentStore): void {
  const agent = store().agent;
  agent.abortRun();
  agent.messages = [];
  agent.threadId = randomUUID();
  if (agent instanceof ServerMemoryHttpAgent) {
    agent.clearSentHistory();
  }
}
