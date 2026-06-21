import process from 'node:process';

import { runChecks } from './run-checks.mjs';

// Human-facing entry point for `npm run verify`: runs the full suite with live
// output and exits non-zero on the first failing step.
const result = runChecks({ full: true });

if (result.status === 'error') {
  console.error(result.message);
  process.exit(1);
}
