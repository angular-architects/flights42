import { randomUUID } from 'node:crypto';

import type { RunAgentInput } from '@ag-ui/core';
import { MastraAgent } from '@ag-ui/mastra';
import type { Agent } from '@mastra/core/agent';

const ENCODER = new TextEncoder();

export function streamNative(
  agent: Agent,
  prompt: string,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await agent.stream(prompt);
        for await (const chunk of stream.fullStream) {
          controller.enqueue(ENCODER.encode(`${JSON.stringify(chunk)}\n`));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export function streamAgUi(
  agent: Agent,
  prompt: string,
): ReadableStream<Uint8Array> {
  const threadId = randomUUID();
  const input: RunAgentInput = {
    threadId,
    runId: randomUUID(),
    messages: [{ id: randomUUID(), role: 'user', content: prompt }],
    tools: [],
    context: [],
  };

  const aguiAgent = new MastraAgent({ agent, resourceId: threadId });

  let subscription: { unsubscribe(): void } | undefined;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      subscription = aguiAgent.run(input).subscribe({
        next: (event) =>
          controller.enqueue(ENCODER.encode(`${JSON.stringify(event)}\n`)),
        error: (error) => controller.error(error),
        complete: () => controller.close(),
      });
    },
    cancel() {
      subscription?.unsubscribe();
    },
  });
}
