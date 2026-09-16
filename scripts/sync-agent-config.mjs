import { cpSync, rmSync, writeFileSync } from 'node:fs';

import { doNotEditWarning } from './utils.mjs';

// `.agents/skills/` is the single source of truth for skills. Codex and
// Google Antigravity read that folder natively; Claude Code expects
// `.claude/skills/`, so the folder is mirrored there.
//
// Nothing else is synced. Hooks and MCP servers are configured per tool by
// hand (`.claude/settings.json` + `.mcp.json`, `.codex/hooks.json` +
// `.codex/config.toml`, `.agents/hooks.json`), see `docs/ai-setup.md`.

rmSync('.claude/skills', { recursive: true, force: true });
cpSync('.agents/skills', '.claude/skills', { recursive: true });
writeFileSync(
  '.claude/skills/DO_NOT_EDIT.txt',
  doNotEditWarning('this directory', '`.agents/skills/`'),
);

console.log('[sync] .agents/skills -> .claude/skills');
