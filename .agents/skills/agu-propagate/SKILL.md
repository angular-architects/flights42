---
name: agu-propagate
description: >-
  Propagate a fix from AGU-solution to every AGU-*-starter branch, the per-lab
  AGU-*-solution branches and the AGU-gemma variant of the flights42 workshop repo by
  rebasing, with backup refs, a merge-tree dry run and a verification pass. Use this whenever the user wants a
  change "on all AGU branches" or "on the other starters", asks to rebase the starters
  (AGU-xyz-starter) onto AGU-solution or the AGU-xyz-solution branches onto their
  starters, or says "Starter rebasen", "an die anderen Starter übertragen", "auf
  AGU-solution rebasen", "den Fix auf die Labs bringen" — even when only one starter
  is named or the request is as short as "wie immer propagieren".
---

# AGU branch propagation

## What the branches are

- `AGU-solution` is the complete workshop app. Every fix lands here first, as a commit.
- `AGU-<lab>-starter` branches are what participants check out. Each one is
  `AGU-solution` plus a few "chore: prepare …" commits that deliberately remove or
  simplify code. Some removals make the lab easier; others are the exercise itself and
  are marked with `TODO` comments the participant has to resolve. Both kinds are
  intentional and must survive a propagation. A starter that looks broken or incomplete
  next to the solution is usually correct.
- Starters can stack or coincide: `AGU-guardrails-starter` sits on
  `AGU-agent-patterns-starter`, and `AGU-images-starter` points at the same commit as
  `AGU-agent-patterns-starter`. The script detects both cases from git.
- `AGU-<lab>-solution` branches (a2ui, ag-ui, hitl, mcp-apps, guardrails, …) are a
  starter plus one solution commit. They are rebased onto their starter after the
  starter moved.
  `AGU-mcp-apps-solution` (since 2026-10-21) is `AGU-mcp-apps-starter` plus
  `feat: solve mcp-apps lab`, the exact reverse of the starter's top commit
  `chore: let participants wire up MCP Apps`. It restores `HOTELS_MCP_SERVER` and the
  `MCPAppsMiddleware` in `ai-server/src/mastra/agents/ticketing-agent.ts` and
  `provideMCPApps(mcpAppsConfig)` in `src/app/app.config.ts`. Invariant:
  `git diff AGU-mcp-apps-starter~1 AGU-mcp-apps-solution` is empty, before and after
  every propagation.
  `AGU-guardrails-solution` (since 2026-10-21) sits on the stacked
  `AGU-guardrails-starter`, so it moves last in the chain `AGU-solution` →
  `AGU-agent-patterns-starter` → `AGU-guardrails-starter` → `AGU-guardrails-solution`.
  Its solution commit replaces the reporting page's `renderChart` frontend tool with a
  tool call renderer for `executeJavaScript` (the end state of lab 05's ToolCall
  Renderer bonus) and also activates the `inputProcessors` line the starter keeps
  commented. The change is deliberately minimal: the page still draws the chart from
  `ReportingChartStore`, and the renderer only feeds that store.
- `AGU-gemma` is a model variant, not a lab: `AGU-solution` plus its own commits
  (`feat: optimize for mid-size models`, `docs: adjust readme`). Its name matches
  neither `AGU-*-starter` nor `AGU-*-solution`, so the script does not see it. It moves
  by hand after the script (procedure step 5).
- Lab texts live in `../workshop-site/workshops/AGU/Labs`. `_context.md` there
  describes the per-starter trimming and logs every propagation. Read its
  "Starter-branch conventions" section when a conflict touches trimmed code.

## Procedure

The script `scripts/agu-propagate.sh` next to this file discovers the topology from
git, so new starters or lab solutions need no configuration. Pick a short kebab-case
topic from the fix (for "fix: executing plans" use `executing-plans`); it names the
backup refs `backup/<branch>-pre-<topic>` and ties the three steps together.

1. The fix must be a commit on `AGU-solution`. If it is still in the working tree, ask
   the user before committing; they review commits first.
2. `bash <skill-dir>/scripts/agu-propagate.sh plan <topic>` prints the topology and a
   merge-tree dry run for every branch without touching a ref. The conflict list tells
   you which files you will resolve by hand. Once backups for the topic exist, `plan`
   takes the old tips from them, so it describes the propagation from those backups.
3. `bash <skill-dir>/scripts/agu-propagate.sh run <topic>` creates the backups and
   rebases in dependency order: direct starters onto `AGU-solution`, stacked starters
   onto their parent, coinciding starters re-pointed with `branch -f`, lab solutions
   onto their starter. It disables `rerere` for every rebase because the repo carries
   stale recorded resolutions that would be replayed silently. On a conflict it stops
   with the rebase in progress and lists the unmerged files. Resolve them, `git add`
   each file, `git rebase --continue`, then re-run `run` with the same topic. It skips
   whatever is already done and returns to the branch you started on.
4. `bash <skill-dir>/scripts/agu-propagate.sh verify <topic>` diffs every branch
   against its backup, scans the whole tree for conflict markers, compares TODO and
   commit counts, and re-checks the topology. Expect "OK (only the propagated files
   differ)", 0 markers, and unchanged TODO and commit counts everywhere. A `CHECK` line
   is legitimate only when the starter deliberately dropped or rewrote a propagated
   file; look at the diff and explain it in the report.
5. Move `AGU-gemma` onto the new `AGU-solution`. `git log --oneline
AGU-solution..AGU-gemma` must list only Gemma's own commits. An extra commit is
   usually an older version of an amended `AGU-solution` commit: use it as `<upstream>`
   so it is dropped. Otherwise `<upstream>` is `git merge-base AGU-solution AGU-gemma`.
   Run `git branch backup/AGU-gemma-pre-<topic> AGU-gemma` and
   `git -c rerere.enabled=false rebase --onto AGU-solution <upstream> AGU-gemma`, then
   check out the branch you started on. Confirm that `git range-diff
<upstream>..backup/AGU-gemma-pre-<topic> AGU-solution..AGU-gemma` shows Gemma's commits
   unchanged and `git grep -l '^<<<<<<< ' AGU-gemma` is empty. On a conflict keep Gemma's
   rewritten prompts and tools and adapt the fix to them.

Work branch by branch and file by file. Do not script resolutions with `git add -u`
loops or `-X ours`/`-X theirs`. A lost TODO or a silently restored feature breaks a lab
for a whole class, and nobody notices until the workshop.

## Resolving conflicts

Inside a rebase, "ours" is the new base (the solution side) and "theirs" is the
starter's prepare commit being replayed. Keep the starter's trimming and bring in only
what the fix changes.

- Keep every `TODO` comment and every deliberate removal. Never restore code the
  prepare commit removed, even if the fix touches it; adapt the fix to the trimmed code.
- If the fix changes code the starter removed entirely, the starter simply does not
  get that part.
- Usual hotspots: `feature-flags/feature-flags.ts` (take the starter's version, append
  new flags), `ticketing-agent-store.ts` (starters rewrite it heavily),
  `assistant-chat.ts` and `ticketing-chat-service.ts` on the a2ui and ag-ui starters,
  `ai-server/src/mastra/agents/ticketing-agent.ts` (the AG-UI starter keeps a
  middleware-free agent; `AGU-guardrails-starter` comments the `inputProcessors` line,
  `AGU-guardrails-solution` has it active). On `AGU-guardrails-solution`: the files
  under `src/app/domains/ticketing/feature-reporting/reporting-page/`
  (`render-chart.tool.ts` holds the renderer instead of the frontend tool;
  `reporting-page.ts`/`.html` add `chartMessage` and `<copilot-render-tool-calls>`),
  `reporting-agent.prompt.ts` and `execute-javascript.ts` (no `renderChart` tool
  anymore). Keep the solution's version and adapt the fix to it; never bring the
  `renderChart` frontend tool back. On `AGU-mcp-apps-solution`: `ticketing-agent.ts`
  and `app.config.ts`. Keep the fix and the restored MCP Apps wiring, with no
  `TODO` left. Then check the invariant above.
- When unsure what a starter intentionally lacks, read its prepare commit with
  `git show <sha>` and the matching section of `_context.md`.
- List unmerged files with `git ls-files -u | awk '{print $4}' | sort -u` and grep each
  one for `^<<<<<<<` before `git add`. Conflicts also hit files outside `src/`
  (`package.json`, lock file, `ai-server/`), which is why `verify` scans the whole tree.
- If you edited TypeScript while resolving, run the project linter with `--fix` on
  that branch before `git rebase --continue` (repo rule: sorted imports).

## Rules

- Never push. The branches track `origin`; after a rebase a push needs
  `--force-with-lease`, and only the user decides when. Mention it in the report.
- Never delete backup refs; the user cleans them up.
- Do not edit lab texts in `../workshop-site`. If the fix changes something a lab
  describes, say so in the report. Lab 05's ToolCall Renderer bonus quotes
  `AGU-guardrails-solution`'s solution commit verbatim in its Show Code blocks, so any
  change to those files on that branch is worth a line. The same goes for lab 03 and
  `AGU-mcp-apps-solution`'s two files.

## Report

Keep it short: the propagated commit(s), the per-branch outcome (clean, or conflicts
resolved in which files and how), every `CHECK` from `verify` with the reason it is
fine, the backup refs created, and that nothing was pushed.
