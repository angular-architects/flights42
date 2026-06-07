import process from 'node:process';

import { runChecks } from '../ci-checks.mjs';

const result = runChecks({ capture: true });

if (result.status === 'error') {
  process.stderr.write(result.message);
  process.exit(2);
}

process.exit(0);
