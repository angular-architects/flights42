import type { Agent } from '@mastra/core/agent';

export async function ensureThread(
  agent: Agent,
  threadId: string,
): Promise<void> {
  const memory = await agent.getMemory();
  if (!memory) {
    return;
  }
  const thread = await memory.getThreadById({ threadId });
  if (thread) {
    return;
  }
  await memory.createThread({ threadId, resourceId: threadId });
}
