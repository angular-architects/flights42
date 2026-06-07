import process from 'node:process';

import { runChecks } from '../ci-checks.mjs';

async function readInput() {
  const chunks = [];
  for await (const c of process.stdin) {
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    return {};
  }
}

export async function runStopHook(adapter) {
  const input = await readInput();

  let result;
  if (adapter.skip?.(input)) {
    result = adapter.success(input);
  } else {
    try {
      runChecks({ capture: true });
      result = adapter.success(input);
    } catch (error) {
      result = adapter.fail(input, error.message);
    }
  }

  const { exitCode = 0, stdout, stderr } = result;
  if (stdout) {
    process.stdout.write(stdout);
  }
  if (stderr) {
    process.stderr.write(stderr);
  }
  process.exit(exitCode);
}
