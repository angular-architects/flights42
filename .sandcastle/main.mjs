// @ts-check
// Parallel Planner — three-phase orchestration loop
//
// Sandcastle's `parallel-planner` template without a sandbox (`noSandbox()`):
// every agent runs directly on the host. The issue tracker is `tickets/`
// (`scripts/tickets.mjs`).
//
// This template drives a multi-phase workflow:
//   Phase 1 (Plan):    An agent analyzes open issues, builds a dependency
//                      graph, and outputs a <plan> JSON listing unblocked issues
//                      with their target branch names.
//   Phase 2 (Execute): N agents run in parallel via Promise.allSettled,
//                      each working a single issue on its own branch.
//   Phase 3 (Merge):   An agent merges all branches that produced commits.
//
// The outer loop repeats up to MAX_ITERATIONS times so that newly unblocked
// issues are picked up after each round of merges.
//
// Usage:
//   npm run sandcastle

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as sandcastle from '@ai-hero/sandcastle';
import { noSandbox } from '@ai-hero/sandcastle/sandboxes/no-sandbox';
import { z } from 'zod';

// The planner emits its plan as JSON inside <plan> tags; Output.object extracts
// and validates it against this schema.
const planSchema = z.object({
  issues: z.array(
    z.object({ id: z.string(), title: z.string(), branch: z.string() }),
  ),
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Maximum number of plan→execute→merge cycles before stopping.
// Raise this if your backlog is large; lower it for a quick smoke-test run.
const MAX_ITERATIONS = 10;

// Copy node_modules from the host into the worktree before each implementer
// starts, so `npm run verify` and the Stop hook work there without an install.
const copyToWorktree = ['node_modules'];

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // -------------------------------------------------------------------------
  // Phase 1: Plan
  //
  // The planning agent reads the open issue list, builds a dependency graph,
  // and selects the issues that can be worked in parallel right now (i.e., no
  // blocking dependencies on other open issues).
  //
  // It outputs a <plan> JSON block — Output.object parses and validates it.
  // -------------------------------------------------------------------------
  const plan = await sandcastle.run({
    sandbox: hostSandbox('planner'),
    name: 'planner',
    // One iteration is enough: the planner just needs to read and reason,
    // not write code. (Structured output requires maxIterations: 1.)
    maxIterations: 1,
    agent: sandcastle.claudeCode('claude-opus-5'),
    promptFile: './.sandcastle/plan-prompt.md',
    // Extract and validate the <plan> JSON into a typed object. Throws
    // StructuredOutputError if the tag is missing, the JSON is malformed, or
    // validation fails — which aborts the loop.
    output: sandcastle.Output.object({ tag: 'plan', schema: planSchema }),
  });

  const issues = plan.output.issues;

  if (issues.length === 0) {
    // No unblocked work — either everything is done or everything is blocked.
    console.log('No unblocked issues to work on. Exiting.');
    break;
  }

  console.log(
    `Planning complete. ${issues.length} issue(s) to work in parallel:`,
  );
  for (const issue of issues) {
    console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
  }

  // -------------------------------------------------------------------------
  // Phase 2: Execute
  //
  // Spawn one agent per issue, all running concurrently.
  // Each agent works on its own branch so there are no conflicts during
  // execution — merging happens in Phase 3.
  //
  // Promise.allSettled means one failing agent doesn't cancel the others.
  // -------------------------------------------------------------------------
  const settled = await Promise.allSettled(
    issues.map((issue) =>
      sandcastle.run({
        copyToWorktree,
        // Each agent starts on its own branch via branchStrategy on run().
        sandbox: hostSandbox(`issue-${issue.id}`),
        branchStrategy: { type: 'branch', branch: issue.branch },
        name: 'implementer',
        // Give each agent plenty of room to implement and iterate on tests.
        maxIterations: 100,
        agent: sandcastle.claudeCode('claude-opus-5'),
        promptFile: './.sandcastle/implement-prompt.md',
        // Prompt arguments substitute {{TASK_ID}}, {{ISSUE_TITLE}},
        // and {{BRANCH}} placeholders in implement-prompt.md before the
        // agent sees the prompt.
        promptArgs: {
          TASK_ID: issue.id,
          ISSUE_TITLE: issue.title,
          BRANCH: issue.branch,
        },
      }),
    ),
  );

  // Log any agents that threw (network error, sandbox crash, etc.).
  for (const [i, outcome] of settled.entries()) {
    if (outcome.status === 'rejected') {
      console.error(
        `  ✗ ${issues[i].id} (${issues[i].branch}) failed: ${outcome.reason}`,
      );
    }
  }

  // Only pass branches that actually produced commits to the merge phase.
  // An agent that ran successfully but made no commits has nothing to merge.
  const completedIssues = settled
    .map((outcome, i) => ({ outcome, issue: issues[i] }))
    .filter(
      (entry) =>
        entry.outcome.status === 'fulfilled' &&
        entry.outcome.value.commits.length > 0,
    )
    .map((entry) => entry.issue);

  const completedBranches = completedIssues.map((i) => i.branch);

  console.log(
    `\nExecution complete. ${completedBranches.length} branch(es) with commits:`,
  );
  for (const branch of completedBranches) {
    console.log(`  ${branch}`);
  }

  if (completedBranches.length === 0) {
    // All agents ran but none made commits — nothing to merge this cycle.
    console.log('No commits produced. Nothing to merge.');
    continue;
  }

  // -------------------------------------------------------------------------
  // Phase 3: Merge
  //
  // One agent merges all completed branches into the current branch,
  // resolving any conflicts and running tests to confirm everything still works.
  //
  // The {{BRANCHES}} and {{ISSUES}} prompt arguments are lists that the agent
  // uses to know which branches to merge and which issues to close.
  // -------------------------------------------------------------------------
  await sandcastle.run({
    sandbox: hostSandbox('merger'),
    name: 'merger',
    maxIterations: 1,
    agent: sandcastle.claudeCode('claude-opus-5'),
    promptFile: './.sandcastle/merge-prompt.md',
    promptArgs: {
      // A markdown list of branch names, one per line.
      BRANCHES: completedBranches.map((b) => `- ${b}`).join('\n'),
      // A markdown list of issue IDs and titles, one per line.
      ISSUES: completedIssues.map((i) => `- ${i.id}: ${i.title}`).join('\n'),
    },
  });

  console.log('\nBranches merged.');
}

console.log('\nAll done.');

/**
 * @param {string} runName
 */
function hostSandbox(runName) {
  return noSandbox({ env: { GIT_CONFIG_GLOBAL: globalGitConfigFor(runName) } });
}

/**
 * Sandcastle's setup runs `git config --global`, which on the host would write
 * to the user's global config: parallel runs fail on its lock and every run
 * leaves a `safe.directory` entry behind. Each run gets its own global config
 * instead, which includes the user's one.
 *
 * @param {string} runName
 * @returns {string}
 */
function globalGitConfigFor(runName) {
  const path = join(tmpdir(), `sandcastle-${runName}.gitconfig`);
  writeFileSync(
    path,
    `[include]
      path = ~/.config/git/config
      path = ~/.gitconfig
    `,
  );
  return path;
}
