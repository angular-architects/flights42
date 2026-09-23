// @ts-check
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import process from 'node:process';

import { claudeCode, run } from '@ai-hero/sandcastle';
import { noSandbox } from '@ai-hero/sandcastle/sandboxes/no-sandbox';

// Implements `ready` tickets from `tickets/` AFK with Sandcastle.
//
// No sandbox is used (`noSandbox()`): the agent runs directly on the host in a
// git worktree on the branch `ticket/<slug>`, with `bypassPermissions` and
// without Claude Code's OS sandbox. That sandbox blocks the browser tests of
// `npm run verify` (Chromium cannot start), so it is off in this setup.
//
// Usage:
//   npm run sandcastle                       # every ticket with status: ready
//   npm run sandcastle -- --ticket tickets/001-foo.md
//   npm run sandcastle -- --model claude-sonnet-5 --rerun

const TICKETS_DIR = 'tickets';
const PROMPT_FILE = '.sandcastle/implement-ticket.md';
const DEFAULT_MODEL = 'claude-opus-5';
const MAX_ITERATIONS = 3;

/**
 * @typedef {object} Ticket
 * @property {string} path
 * @property {string} slug
 * @property {string} status
 * @property {string} content
 */

const args = process.argv.slice(2);
const model =
  option('--model') ?? process.env['SANDCASTLE_MODEL'] ?? DEFAULT_MODEL;
const only = option('--ticket');
const rerun = args.includes('--rerun');
const hostRoot = process.cwd();

const tickets = only
  ? [readTicket(only)]
  : readTickets().filter((ticket) => ticket.status === 'ready');

if (tickets.length === 0) {
  console.log(
    `No ticket with "status: ready" in ${TICKETS_DIR}/ (see tickets/README.md).`,
  );
  process.exit(0);
}

for (const ticket of tickets) {
  const branch = `ticket/${ticket.slug}`;

  if (!rerun && branchExists(branch)) {
    console.log(`Skipping ${ticket.path}: branch ${branch} exists (--rerun).`);
    continue;
  }

  console.log(`\n=== ${ticket.path} -> ${branch} (${model}) ===`);

  const result = await run({
    name: ticket.slug,
    agent: claudeCode(model, { permissionMode: 'bypassPermissions' }),
    sandbox: noSandbox(),
    promptFile: PROMPT_FILE,
    promptArgs: { TICKET_PATH: ticket.path, TICKET: ticket.content },
    branchStrategy: { type: 'branch', branch },
    maxIterations: MAX_ITERATIONS,
    hooks: {
      host: {
        // Runs inside the fresh worktree before the agent starts.
        onWorktreeReady: [
          {
            command: `ln -s ${quote(join(hostRoot, 'node_modules'))} node_modules`,
          },
        ],
      },
    },
  });

  const outcome = result.completionSignal
    ? 'completed'
    : 'stopped without completion signal';
  console.log(
    `${outcome}: ${result.commits.length} commit(s) on ${result.branch}`,
  );
  if (result.logFilePath) {
    console.log(`log: ${result.logFilePath}`);
  }
  if (result.preservedWorktreePath) {
    console.log(`uncommitted changes left in ${result.preservedWorktreePath}`);
  }
}

/**
 * @param {string} name
 * @returns {string | undefined}
 */
function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

/** @returns {Ticket[]} */
function readTickets() {
  return readdirSync(TICKETS_DIR)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .sort()
    .map((file) => readTicket(join(TICKETS_DIR, file)));
}

/**
 * @param {string} path
 * @returns {Ticket}
 */
function readTicket(path) {
  const content = readFileSync(path, 'utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1] ?? '';
  const status = /^status:\s*(\S+)/m.exec(frontmatter)?.[1] ?? 'draft';
  return { path, slug: basename(path, '.md'), status, content };
}

/**
 * @param {string} branch
 * @returns {boolean}
 */
function branchExists(branch) {
  try {
    execFileSync(
      'git',
      ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`],
      { stdio: 'ignore' },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} value
 * @returns {string}
 */
function quote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
