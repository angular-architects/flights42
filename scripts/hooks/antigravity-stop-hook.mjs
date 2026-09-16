import process from 'node:process';

import { runChecks } from '../run-checks.mjs';
import { readInput } from './read-input.mjs';

// Stop hook for Google Antigravity (configured in `.agents/hooks.json`).
// Antigravity reads a JSON decision from stdout: `{ decision: 'continue',
// reason }` re-enters the agent loop and injects `reason` as a system
// message; any other output lets the agent stop.
const input = await readInput();

// The hook may not start in the workspace root; run the checks from there.
const [workspace] = input.workspacePaths ?? [];
if (workspace) {
  process.chdir(workspace);
}

// A run that ended with an error is not worth re-checking.
if (!input.error) {
  const result = runChecks({ capture: true });
  if (result.status === 'error') {
    process.stdout.write(
      JSON.stringify({ decision: 'continue', reason: result.message }),
    );
    process.exit(0);
  }
}

process.stdout.write('{}');
process.exit(0);
