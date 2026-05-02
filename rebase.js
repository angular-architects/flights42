#!/usr/bin/env node
import { execSync } from 'node:child_process';

const tasks = [
  { branch: 'ENT-chat-starter', base: 'FULL' },
  { branch: 'ENT-llm-integration-starter', base: 'FULL' },
  { branch: 'ENT-nf-sol', base: 'FULL' },
  { branch: 'ENT-nf-starter', base: 'FULL' },
  { branch: 'ENT-sheriff-starter', base: 'FULL' },
  { branch: 'ENT-signal-forms-starter', base: 'FULL' },
  { branch: 'ENT-signal-store-starter', base: 'FULL' },
  { branch: 'ENT-signals-solution', base: 'FULL' },
  { branch: 'ENT-signals-starter', base: 'ENT-signals-solution' },
];

const args = process.argv.slice(2);
const check = args.includes('--check');
const doBuild = check || args.includes('--build');
const doLint = check || args.includes('--lint');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function runSafe(cmd, branch, label) {
  try {
    run(cmd);
  } catch {
    console.error(`\n❌ ${label} failed on branch ${branch}. Aborting.`);
    process.exit(1);
  }
}

function main() {
  // Sicherheitscheck: sauberes Working Tree
  try {
    const status = execSync('git status --porcelain', {
      encoding: 'utf8',
    }).trim();
    if (status.length > 0) {
      console.error(
        '❌ Working tree ist nicht clean. Bitte commit/stash vorher.',
      );
      process.exit(1);
    }
  } catch {
    console.error('❌ Kein Git-Repo oder git nicht verfügbar.');
    process.exit(1);
  }

  const startBranch = execSync('git branch --show-current', {
    encoding: 'utf8',
  }).trim();

  for (const { branch, base } of tasks) {
    console.log(`\n==============================`);
    console.log(`Rebase: ${branch}  <-  ${base}`);
    console.log(`==============================`);

    // branch auschecken
    run(`git checkout ${branch}`);

    // Rebase
    run(`git rebase ${base}`);

    console.log(`✅ OK: ${branch} rebased on ${base}`);

    if (doBuild) {
      runSafe('npx ng build', branch, 'Build');
      console.log(`✅ Build OK: ${branch}`);
    }

    if (doLint) {
      runSafe('npx ng lint', branch, 'Lint');
      console.log(`✅ Lint OK: ${branch}`);
    }
  }

  // zurück zum Start-Branch
  if (startBranch) {
    run(`git checkout ${startBranch}`);
  }

  console.log('\n🎉 Fertig.');
}

main();
