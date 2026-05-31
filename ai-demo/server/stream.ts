import { randomUUID } from 'node:crypto';

import type { RunAgentInput } from '@ag-ui/core';
import { MastraAgent } from '@ag-ui/mastra';
import type { Response } from 'express';

import { weatherAgent } from './agent.js';

export async function streamNative(
  prompt: string,
  response: Response,
): Promise<void> {
  const stream = await weatherAgent.stream(prompt);
  for await (const chunk of stream.fullStream) {
    response.write(`${JSON.stringify(chunk)}\n`);
  }
}

export async function streamAgUi(
  prompt: string,
  response: Response,
): Promise<void> {
  const threadId = randomUUID();
  const input: RunAgentInput = {
    threadId,
    runId: randomUUID(),
    messages: [{ id: randomUUID(), role: 'user', content: prompt }],
    tools: [],
    context: [],
  };

  const aguiAgent = new MastraAgent({
    agent: weatherAgent,
    resourceId: threadId,
  });

  await new Promise<void>((resolve, reject) => {
    aguiAgent.run(input).subscribe({
      next: (event) => response.write(`${JSON.stringify(event)}\n`),
      error: reject,
      complete: resolve,
    });
  });
}
