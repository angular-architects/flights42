import process from 'node:process';

import { runChecks } from '../run-checks.mjs';
import { readInput } from './read-input.mjs';

const input = await readInput();

const [workspace] = input.workspacePaths ?? [];
if (workspace) {
  process.chdir(workspace);
}

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
