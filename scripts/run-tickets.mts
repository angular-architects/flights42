import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import process from 'node:process';

import { claudeCode, run } from '@ai-hero/sandcastle';
import { noSandbox } from '@ai-hero/sandcastle/sandboxes/no-sandbox';

// Implements `ready` tickets from `tickets/` AFK with Sandcastle.
//
// Sandcastle's own container sandbox is not used (`noSandbox()`): the agent
// runs on the host in a git worktree on the branch `ticket/<slug>`. Isolation
// comes from Claude Code's built-in OS sandbox instead. It is enabled through
// `.sandcastle/claude-settings.json`, which is copied into the worktree as
// `.claude/settings.local.json`, so every shell command the agent runs is
// confined to that worktree.
//
// Usage:
//   npm run tickets                          # every ticket with status: ready
//   npm run tickets -- --ticket tickets/001-foo.md
//   npm run tickets -- --model claude-sonnet-5 --rerun

const TICKETS_DIR = 'tickets';
const PROMPT_FILE = '.sandcastle/implement-ticket.md';
const CLAUDE_SETTINGS = '.sandcastle/claude-settings.json';
const DEFAULT_MODEL = 'claude-opus-5';
const MAX_ITERATIONS = 3;

interface Ticket {
  path: string;
  slug: string;
  status: string;
  content: string;
}

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
          {
            command: `mkdir -p .claude && cp ${quote(join(hostRoot, CLAUDE_SETTINGS))} .claude/settings.local.json`,
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

function option(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readTickets(): Ticket[] {
  return readdirSync(TICKETS_DIR)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .sort()
    .map((file) => readTicket(join(TICKETS_DIR, file)));
}

function readTicket(path: string): Ticket {
  const content = readFileSync(path, 'utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1] ?? '';
  const status = /^status:\s*(\S+)/m.exec(frontmatter)?.[1] ?? 'draft';
  return { path, slug: basename(path, '.md'), status, content };
}

function branchExists(branch: string): boolean {
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

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
