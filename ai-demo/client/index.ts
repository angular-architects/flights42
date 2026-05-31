import process, { stdout } from 'node:process';

import { type AgentSubscriber, HttpAgent, randomUUID } from '@ag-ui/client';
import type { AGUIEvent, BaseEvent } from '@ag-ui/core';

import { closeInput, readLine } from './input.js';
import { detailFor } from './utils.js';

const SHOW_DETAILS = false;

const baseUrl = process.env.AI_DEMO_URL ?? 'http://localhost:4555';

// One thread per client session so the agent remembers earlier turns. The
// server uses this id as both the thread and the owning resource.
const threadId = randomUUID();

const agent = new HttpAgent({
  url: `${baseUrl}/chat`,
  threadId,
});

async function ask(prompt: string): Promise<void> {
  agent.addMessage({
    id: randomUUID(),
    role: 'user',
    content: prompt,
  });

  const subscriber: AgentSubscriber = {};

  if (SHOW_DETAILS) {
    subscriber.onEvent = ({ event }) => {
      logEvent(event);
    };
  } else {
    subscriber.onTextMessageContentEvent = ({ event }) => {
      stdout.write(event.delta);
    };
  }

  await agent.runAgent({ runId: randomUUID() }, subscriber);
}

function logEvent(event: BaseEvent): void {
  const type = String(event.type ?? 'unknown');
  console.log(`[${type.padEnd(35)}] ${detailFor(event as AGUIEvent)}`);
}

async function main(): Promise<void> {
  console.log(`AI-Demo client → ${baseUrl}/chat  (SHOW_RAW=${SHOW_DETAILS})`);
  console.log('Ask about the weather in a city. Type "exit" to quit.');

  for (;;) {
    const prompt = await readLine('\n> ');
    if (prompt === undefined) {
      break;
    }
    if (!prompt) {
      continue;
    }
    if (prompt === 'exit' || prompt === 'quit') {
      break;
    }

    await ask(prompt);
  }

  closeInput();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
