import { stdout } from 'node:process';

import { closeInput, readLine } from './input.js';
import { detailFor, extractText } from './utils.js';

const SHOW_DETAILS = false;

const url = process.env.AI_DEMO_URL ?? 'http://localhost:4555';

async function ask(prompt: string): Promise<void> {
  const response = await fetch(`${url}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.body) {
    throw new Error('Response has no body to stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const message = JSON.parse(line) as Record<string, unknown>;

      if (SHOW_DETAILS) {
        const type = String(message['type'] ?? 'unknown');
        console.log(`[${type.padEnd(35)}] ${detailFor(message)}`);
      } else {
        const text = extractText(message);
        stdout.write(text ?? '');
      }
    }
  }
}

async function main(): Promise<void> {
  console.log(`AI-Demo client → ${url}  (SHOW_RAW=${SHOW_DETAILS})`);
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
