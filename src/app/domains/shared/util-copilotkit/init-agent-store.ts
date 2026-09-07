import { HttpAgent, randomUUID } from '@ag-ui/client';
import { type Context } from '@ag-ui/core';
import {
  EnvironmentInjector,
  inject,
  runInInjectionContext,
} from '@angular/core';
import {
  connectAgentContext,
  CopilotKit,
  type FrontendToolConfig,
  type HumanInTheLoopConfig,
  registerComponent,
  type RegisterComponentConfig,
  registerFrontendTool,
  registerHumanInTheLoop,
  registerRenderToolCall,
  type RenderToolCallConfig,
} from '@copilotkit/angular';

import { catalogToContextEntry } from './a2ui/catalog-context';
import { A2UI_CUSTOM_CATALOG } from './a2ui/provide-a2ui-catalog';
import {
  attachSentFilter,
  developerMessagesAsUser,
  forwardedPropsMiddleware,
  ResumedToolCallMiddleware,
} from './agent-middlewares';

export interface InitAgentStoreConfig {
  agentId: string;
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frontendTools?: readonly FrontendToolConfig<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolCallRenderer?: readonly RenderToolCallConfig<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  humanInTheLoop?: readonly HumanInTheLoopConfig<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components?: readonly RegisterComponentConfig<any>[];
  context?: readonly Context[];
  forwardedProps?: () => Record<string, unknown>;
  useServerMemory?: boolean;
}

export function initAgentStore(config: InitAgentStoreConfig): void {
  const copilotKit = inject(CopilotKit);

  const envInjector = inject(EnvironmentInjector);

  const forwardedPropsFor = (): Record<string, unknown> =>
    config.forwardedProps
      ? runInInjectionContext(envInjector, () => config.forwardedProps!())
      : {};

  const httpAgent = new HttpAgent({
    agentId: config.agentId,
    url: config.url,
    threadId: randomUUID(),
  });

  httpAgent.use(
    forwardedPropsMiddleware(forwardedPropsFor),
    developerMessagesAsUser,
  );
  if (config.useServerMemory) {
    attachSentFilter(httpAgent);
  }
  httpAgent.use(new ResumedToolCallMiddleware());

  connectCatalogContext(config.agentId);

  for (const entry of config.context ?? []) {
    connectAgentContext(
      () => ({ ...entry, agentIds: [config.agentId] }) as Context,
    );
  }

  copilotKit.updateRuntime({
    selfManagedAgents: {
      ...copilotKit.agents(),
      [config.agentId]: httpAgent,
    },
  });

  for (const tool of config.frontendTools ?? []) {
    registerFrontendTool({
      ...tool,
      agentId: config.agentId,
    });
  }

  for (const toolCall of config.toolCallRenderer ?? []) {
    registerRenderToolCall({ ...toolCall, agentId: config.agentId });
  }

  for (const tool of config.humanInTheLoop ?? []) {
    registerHumanInTheLoop({ ...tool, agentId: config.agentId });
  }

  for (const component of config.components ?? []) {
    registerComponent({ ...component, agentId: config.agentId });
  }
}

function connectCatalogContext(agentId: string): void {
  const catalog = inject(A2UI_CUSTOM_CATALOG, { optional: true });
  if (!catalog) {
    return;
  }

  const entry = catalogToContextEntry(catalog);
  connectAgentContext(() => ({ ...entry, agentIds: [agentId] }) as Context);
}
