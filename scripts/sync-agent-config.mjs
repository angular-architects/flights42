import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { doNotEditWarning, toCursorHooks } from './utils.mjs';

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

// Hooks: .agents/hooks.json -> .claude/settings.json (Claude) and .cursor/hooks.json (Cursor)
const hooks = JSON.parse(readFileSync('.agents/hooks.json', 'utf8'));
writeFileSync('.claude/settings.json', `${JSON.stringify(hooks, null, 2)}\n`);
writeFileSync(
  '.claude/settings.DO_NOT_EDIT.txt',
  doNotEditWarning('`.claude/settings.json`', '`.agents/hooks.json`'),
);
const cursorHooks = { version: 1, hooks: toCursorHooks(hooks.hooks) };
writeFileSync(
  '.cursor/hooks.json',
  `${JSON.stringify(cursorHooks, null, 2)}\n`,
);
writeFileSync(
  '.cursor/hooks.DO_NOT_EDIT.txt',
  doNotEditWarning('`.cursor/hooks.json`', '`.agents/hooks.json`'),
);

console.log(
  '[sync] agent config updated (.claude/skills, .mcp.json, .cursor/mcp.json, .claude/settings.json, .cursor/hooks.json)',
);
