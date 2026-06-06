import { execSync } from 'node:child_process';

// Shared quality checks for the Cursor and Claude Code stop hooks.
const steps = [
  'npx ng lint flights',
  'npm run test:arch',
  'npx ng test flights --configuration ci',
  'npx ng build flights',
];

for (const step of steps) {
  console.log(`\n[ci-checks] ${step}`);
  execSync(step, { stdio: 'inherit' });
}
