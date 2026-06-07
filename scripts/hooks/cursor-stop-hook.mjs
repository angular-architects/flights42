import process from 'node:process';

import { runChecks } from '../ci-checks.mjs';
import { readInput } from './read-input.mjs';

const input = await readInput();

if (input.status !== 'aborted') {
  const result = runChecks({ capture: true });
  if (result.status === 'error') {
    process.stdout.write(JSON.stringify({ followup_message: result.message }));
    process.exit(0);
  }
}

process.stdout.write('{}');
process.exit(0);
