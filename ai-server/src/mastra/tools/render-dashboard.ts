import { createTool } from '@mastra/core/tools';

import { compileDashboard } from '../dashboard-dsl/compile-dashboard.js';
import {
  type DashboardSpec,
  dashboardSpecSchema,
} from '../dashboard-dsl/dashboard-spec.js';
import { recordDashboardRun } from '../dashboard-dsl/spec-channel.js';

export const RENDER_DASHBOARD_TOOL_NAME = 'renderDashboard';

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
  execute: async (input: DashboardSpec) => {
    const compiled = await compileDashboard(input);
    recordDashboardRun(compiled.surfaceId, input, compiled.dataSteps);
    return {
      surfaceId: compiled.surfaceId,
      messages: [...compiled.structural, ...compiled.dataModel],
    };
  },
});
