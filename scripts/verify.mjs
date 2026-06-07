import process from 'node:process';

import { runChecks } from './ci-checks.mjs';

// Human-facing entry point for `npm run verify`: runs the full suite with live
// output and exits non-zero on the first failing step.
try {
  runChecks({ full: true });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
