import { createTool } from '@mastra/core/tools';

import { dashboardSpecSchema } from '../dashboard-dsl/dashboard-spec.js';

export const RENDER_DASHBOARD_TOOL_NAME = 'renderDashboard';

// Pure schema-only tool. The LLM emits exactly one `renderDashboard`
// call whose args are the dashboard DSL spec; the route handler
// intercepts those args, deterministically compiles the spec, and
// emits the resulting A2UI surface itself. The tool execute returns a
// minimal acknowledgement so Mastra's auto-snapshot path
// (`extractA2uiSurfacePayload`) does not produce an `a2ui-surface`
// `ACTIVITY_SNAPSHOT` and the LLM's tool-result message stays small.
export const renderDashboardTool = createTool({
  id: RENDER_DASHBOARD_TOOL_NAME,
  description: [
    'Render the Flight42 dashboard from a compact spec.',
    '',
    'Input is a `{ tiles: Tile[] }` object describing which tiles to show.',
    'The server compiles this spec into a complete A2UI v0.9 surface',
    'deterministically — the assistant never produces A2UI directly.',
    '',
    'Tiles render in the order you list them. Use proper city names',
    '(e.g. "Graz", "Hamburg") — never airport codes.',
  ].join('\n'),
  inputSchema: dashboardSpecSchema,
  execute: async () => ({ ok: true }),
});
