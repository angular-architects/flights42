import {
  type FrontendToolConfig,
  type HumanInTheLoopConfig,
  type RenderToolCallConfig,
} from '@copilotkit/angular';

const TERMINAL_TOOL_HINT =
  `\n\nCalling this tool ENDS your turn — the agent is not invoked again ` +
  `afterwards. Do all data gathering and other tool calls in EARLIER steps ` +
  `and wait for their results first. NEVER mix this tool into the same ` +
  `tool-call batch as non-widget tools — those calls would be dropped ` +
  `unexecuted. Emit it (together with any other end-of-turn widgets) as the ` +
  `LAST step of the turn.`;

/**
 * Identity helper for a browser-executed frontend tool. Keeps schema, name,
 * description, handler, and optional renderer component together, and gives the
 * handler args full type inference from the Zod `parameters` schema. Does not
 * register or inject anything. When the tool opts out of a follow-up turn
 * (`followUp: false`), its description is extended with a hint so the agent
 * knows the call is terminal.
 */
export function createFrontendTool<Args extends Record<string, unknown>>(
  tool: FrontendToolConfig<Args>,
): FrontendToolConfig<Args> {
  if (
    tool.followUp === false &&
    !tool.description.includes(TERMINAL_TOOL_HINT)
  ) {
    return { ...tool, description: tool.description + TERMINAL_TOOL_HINT };
  }
  return tool;
}

/**
 * Identity helper for rendering an existing (usually server-side) tool call.
 * Keeps tool name, args schema, and renderer component together.
 */
export function createRenderToolCall<Args extends Record<string, unknown>>(
  toolCall: RenderToolCallConfig<Args>,
): RenderToolCallConfig<Args> {
  return toolCall;
}

/**
 * Identity helper for a human-in-the-loop tool that pauses until the user
 * responds through the renderer's `respond(...)` callback.
 */
export function createHumanInTheLoop<Args extends Record<string, unknown>>(
  tool: HumanInTheLoopConfig<Args>,
): HumanInTheLoopConfig<Args> {
  return tool;
}
