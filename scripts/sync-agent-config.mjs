import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { doNotEditWarning } from './utils.mjs';

// Hooks are NOT synced: every coding agent has its own entry point (config
// location, schema and hook I/O protocol). They are hand-maintained per
// platform in `.claude/settings.json` and `.cursor/hooks.json`. The only thing
// shared is the logic itself (`scripts/run-checks.mjs`), which each platform's
// hook script calls.

// Skills: .agents/skills -> .claude/skills
rmSync('.claude/skills', { recursive: true, force: true });
cpSync('.agents/skills', '.claude/skills', { recursive: true });
writeFileSync(
  '.claude/skills/DO_NOT_EDIT.txt',
  doNotEditWarning('this directory', '`.agents/skills/`'),
);

// MCP: .agents/mcp.json -> .mcp.json (Claude) and .cursor/mcp.json (Cursor)
const mcp = readFileSync('.agents/mcp.json', 'utf8');
writeFileSync('.mcp.json', mcp);
writeFileSync(
  '.mcp.DO_NOT_EDIT.txt',
  doNotEditWarning('`.mcp.json`', '`.agents/mcp.json`'),
);
writeFileSync('.cursor/mcp.json', mcp);
writeFileSync(
  '.cursor/mcp.DO_NOT_EDIT.txt',
  doNotEditWarning('`.cursor/mcp.json`', '`.agents/mcp.json`'),
);

console.log(
  '[sync] agent config updated (.claude/skills, .mcp.json, .cursor/mcp.json)',
);
