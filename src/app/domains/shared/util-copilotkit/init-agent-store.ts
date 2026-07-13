import { randomUUID } from '@ag-ui/client';
import { type Context } from '@ag-ui/core';
import {
  EnvironmentInjector,
  inject,
  runInInjectionContext,
} from '@angular/core';
import {
  CopilotKit,
  type FrontendToolConfig,
  type HumanInTheLoopConfig,
  registerFrontendTool,
  registerHumanInTheLoop,
  registerRenderToolCall,
  type RenderToolCallConfig,
} from '@copilotkit/angular';

import { AppHttpAgent } from './app-http-agent';
import { FallbackToolCard, fallbackToolCard } from './fallback-tool-card';

export interface InitAgentStoreConfig {
  agentId: string;
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frontendTools?: readonly FrontendToolConfig<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolCallRenderer?: readonly RenderToolCallConfig<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  humanInTheLoop?: readonly HumanInTheLoopConfig<any>[];
  forwardedProps?: () => Record<string, unknown>;
  context?: () => readonly Context[];
  useServerMemory?: boolean;
}

export function initAgentStore(config: InitAgentStoreConfig): void {
  const copilotKit = inject(CopilotKit);

  const envInjector = inject(EnvironmentInjector);

  const forwardedPropsFor = (): Record<string, unknown> =>
    config.forwardedProps
      ? runInInjectionContext(envInjector, () => config.forwardedProps!())
      : {};

  const contextFor = (): readonly Context[] =>
    config.context
      ? runInInjectionContext(envInjector, () => config.context!())
      : [];

  const agentConfig = {
    agentId: config.agentId,
    url: config.url,
    threadId: randomUUID(),
  };

  const httpAgent = new AppHttpAgent(agentConfig, {
    forwardedProps: forwardedPropsFor,
    context: contextFor,
    useServerMemory: config.useServerMemory,
  });

  copilotKit.updateRuntime({
    selfManagedAgents: {
      ...copilotKit.agents(),
      [config.agentId]: httpAgent,
    },
  });

  for (const tool of config.frontendTools ?? []) {
    registerFrontendTool({
      ...tool,
      component: tool.component || FallbackToolCard,
      agentId: config.agentId,
    });
  }

  const registeredFallback = copilotKit
    .toolCallRenderConfigs()
    .find((renderer) => renderer.name === '*');
  if (!registeredFallback) {
    registerRenderToolCall(fallbackToolCard);
  }

  for (const toolCall of config.toolCallRenderer ?? []) {
    registerRenderToolCall({ ...toolCall, agentId: config.agentId });
  }

  for (const tool of config.humanInTheLoop ?? []) {
    registerHumanInTheLoop({ ...tool, agentId: config.agentId });
  }
}
