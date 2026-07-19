import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

const rl = createInterface({ input: stdin, output: stdout, terminal: false });

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
