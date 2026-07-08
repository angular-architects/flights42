import {
  type FrontendToolConfig,
  type HumanInTheLoopConfig,
  type RenderToolCallConfig,
} from '@copilotkit/angular';

type WithoutAgentId<T> = Omit<T, 'agentId'> & {
  agentId?: never;
};

type FrontendToolHandler<Args extends Record<string, unknown>> = {
  bivarianceHack(
    args: Args,
    context: Parameters<FrontendToolConfig<Args>['handler']>[1],
  ): Promise<unknown>;
}['bivarianceHack'];

export type FrontendToolDefinition<
  Args extends Record<string, unknown> = Record<string, unknown>,
> = WithoutAgentId<
  Omit<FrontendToolConfig<Args>, 'handler'> & {
    handler: FrontendToolHandler<Args>;
  }
>;

export type RenderToolCallDefinition<
  Args extends Record<string, unknown> = Record<string, unknown>,
> = WithoutAgentId<RenderToolCallConfig<Args>>;

export type HumanInTheLoopDefinition<
  Args extends Record<string, unknown> = Record<string, unknown>,
> = WithoutAgentId<HumanInTheLoopConfig<Args>>;

export function createFrontendTool<Args extends Record<string, unknown>>(
  tool: FrontendToolDefinition<Args>,
): FrontendToolDefinition<Args> {
  return tool;
}

export function createRenderToolCall<Args extends Record<string, unknown>>(
  toolCall: RenderToolCallDefinition<Args>,
): RenderToolCallDefinition<Args> {
  return toolCall;
}

export function createHumanInTheLoop<Args extends Record<string, unknown>>(
  tool: HumanInTheLoopDefinition<Args>,
): HumanInTheLoopDefinition<Args> {
  return tool;
}
