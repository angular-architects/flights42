import {
  type FrontendToolConfig,
  type HumanInTheLoopConfig,
  type RenderToolCallConfig,
} from '@copilotkit/angular';

/**
 * Forbids `agentId` on a tool definition. The concrete agent binding is added
 * centrally by `agentStore(...)` when the agent store is initialized, so tool
 * definitions stay agent-agnostic and reusable.
 */
export type WithoutAgentId<T> = Omit<T, 'agentId'> & {
  agentId?: never;
};

/**
 * Identity helper for a browser-executed frontend tool. Keeps schema, name,
 * description, handler, and optional renderer component together, and gives the
 * handler args full type inference from the Zod `parameters` schema. Does not
 * register or inject anything.
 */
export function createFrontendTool<Args extends Record<string, unknown>>(
  tool: WithoutAgentId<FrontendToolConfig<Args>>,
): WithoutAgentId<FrontendToolConfig<Args>> {
  return tool;
}

/**
 * Identity helper for rendering an existing (usually server-side) tool call.
 * Keeps tool name, args schema, and renderer component together.
 */
export function createRenderToolCall<Args extends Record<string, unknown>>(
  toolCall: WithoutAgentId<RenderToolCallConfig<Args>>,
): WithoutAgentId<RenderToolCallConfig<Args>> {
  return toolCall;
}

/**
 * Identity helper for a human-in-the-loop tool that pauses until the user
 * responds through the renderer's `respond(...)` callback.
 */
export function createHumanInTheLoop<Args extends Record<string, unknown>>(
  tool: WithoutAgentId<HumanInTheLoopConfig<Args>>,
): WithoutAgentId<HumanInTheLoopConfig<Args>> {
  return tool;
}
