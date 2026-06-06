import { execSync } from 'node:child_process';

// Shared quality checks for the Cursor and Claude Code stop hooks.
//
// Fast checks run on every stop hook: they are cheap and give high signal
// (lint incl. Sheriff boundaries, plus the tsarch suffix/role rules).
//
// The slow checks (browser unit tests and the production build) only run with
// `--full`, e.g. via `npm run verify` or in CI. They are too expensive to run
// after every agent turn.
const fastSteps = ['npx ng lint flights', 'npm run test:arch'];

const fullOnlySteps = [
  'npx ng test flights --configuration ci',
  'npx ng build flights',
];

const runFull = process.argv.includes('--full');
const steps = runFull ? [...fastSteps, ...fullOnlySteps] : fastSteps;

console.log(`[ci-checks] mode: ${runFull ? 'full' : 'fast'}`);

for (const step of steps) {
  console.log(`\n[ci-checks] ${step}`);
  execSync(step, { stdio: 'inherit' });
}
