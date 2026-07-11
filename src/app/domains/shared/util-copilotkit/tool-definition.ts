import {
  type FrontendToolConfig,
  type HumanInTheLoopConfig,
  type RenderToolCallConfig,
} from '@copilotkit/angular';

/**
 * Identity helper for a browser-executed frontend tool. Keeps schema, name,
 * description, handler, and optional renderer component together, and gives the
 * handler args full type inference from the Zod `parameters` schema. Does not
 * register or inject anything.
 */
export function createFrontendTool<Args extends Record<string, unknown>>(
  tool: FrontendToolConfig<Args>,
): FrontendToolConfig<Args> {
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
