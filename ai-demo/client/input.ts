import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

const rl = createInterface({ input: stdin, output: stdout });

/**
 * Reads a single trimmed line from the console. Returns undefined when the
 * input stream is closed (e.g. Ctrl+D) so callers can end their loop.
 */
export async function readLine(label: string): Promise<string | undefined> {
  try {
    return (await rl.question(label)).trim();
  } catch {
    return undefined;
  }
}

export function closeInput(): void {
  rl.close();
}
