import { execSync } from 'node:child_process';

import { CiCheckError } from './ci-check-error.mjs';

const fastSteps = [
  'npx ng lint flights',
  'npm run test:arch',
  'npm run test:scripts',
];

const fullOnlySteps = [
  'npx ng test flights --configuration ci',
  'npx ng build flights',
];

export function runChecks({ full = false, capture = false } = {}) {
  const steps = full ? [...fastSteps, ...fullOnlySteps] : fastSteps;
  for (const step of steps) {
    try {
      execSync(step, capture ? { encoding: 'utf8' } : { stdio: 'inherit' });
    } catch (error) {
      const out = capture
        ? [error.stdout, error.stderr].filter(Boolean).join('\n').trim()
        : '';
      throw new CiCheckError(step, out || error.message);
    }
  }
}
