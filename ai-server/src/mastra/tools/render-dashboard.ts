import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const RENDER_DASHBOARD_TOOL_NAME = 'renderDashboard';

export const renderDashboardInputSchema = z.object({
  express: z
    .string()
    .describe(
      'Dashboard program in the format from the system prompt, including the <a2ui> and </a2ui> tags.',
    ),
});

// Pure schema-only tool. The LLM emits exactly one `renderDashboard`
// call whose args are the dashboard program; the dashboard route handler
// intercepts those args, deterministically compiles the program, and
// emits the resulting A2UI surface itself. The tool execute returns a
// minimal acknowledgement so the LLM's tool-result message stays small.
export const renderDashboard = createTool({
  id: RENDER_DASHBOARD_TOOL_NAME,
  description: `
    Render the Flight42 dashboard from a compact program.

    The server compiles this program into a complete A2UI v0.9 surface
    deterministically — the assistant never produces any other UI.

    Tiles render in the order listed in root. Use proper city names
    (e.g. "Graz", "Hamburg") — never airport codes.
  `,
  inputSchema: renderDashboardInputSchema,
  execute: async () => ({ ok: true }),
});
