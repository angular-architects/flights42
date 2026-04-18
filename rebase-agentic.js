#!/usr/bin/env node
import { execSync } from 'node:child_process';

const tasks = [
  { branch: 'a2ui', base: 'agentic' },
  { branch: 'mcp-apps', base: 'agentic' },
  { branch: 'hitl', base: 'mcp-apps' },
];

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
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
  }

  // zurück zum Start-Branch
  if (startBranch) {
    run(`git checkout ${startBranch}`);
  }

  console.log('\n🎉 Fertig.');
}

main();
