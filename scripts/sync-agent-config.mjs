import { cpSync, rmSync, writeFileSync } from 'node:fs';

const skillsWarning = `DO NOT EDIT THIS DIRECTORY.

These files are a generated copy produced by \`npm run sync:agent-config\`
from \`.agents/skills/\`. Any change here is overwritten on the next sync.
Edit the source under \`.agents/skills/\` instead.
`;

const mcpWarning = `DO NOT EDIT \`.mcp.json\`.

It is a generated copy produced by \`npm run sync:agent-config\`
from \`.cursor/mcp.json\`. Any change here is overwritten on the next sync.
Edit \`.cursor/mcp.json\` instead.
`;

rmSync('.claude/skills', { recursive: true, force: true });
cpSync('.agents/skills', '.claude/skills', { recursive: true });
writeFileSync('.claude/skills/DO_NOT_EDIT.txt', skillsWarning);

cpSync('.cursor/mcp.json', '.mcp.json');
writeFileSync('.mcp.DO_NOT_EDIT.txt', mcpWarning);

console.log('[sync] agent config updated (.claude/skills, .mcp.json)');
