import process from 'node:process';

import { runChecks } from '../run-checks.mjs';

// Stop hook for Claude Code and Codex (configured in `.claude/settings.json`
// and `.codex/hooks.json`). Both agents use the same hook protocol: exit
// code 2 blocks the stop and stderr is fed back to the agent as the reason,
// so the agent keeps working until the checks pass.
const result = runChecks({ capture: true });

if (result.status === 'error') {
  process.stderr.write(result.message);
  process.exit(2);
}

process.exit(0);
