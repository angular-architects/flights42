import { randomUUID } from '@ag-ui/client';
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
  registerFrontendTool,
  registerHumanInTheLoop,
  registerRenderToolCall,
  type RenderToolCallConfig,
} from '@copilotkit/angular';

import {
  catalogIdToContextEntry,
  catalogToContextEntry,
} from './a2ui/catalog-context';
import {
  A2UI_CUSTOM_CATALOG,
  A2UI_SEND_CATALOG_DESCRIPTION,
} from './a2ui/provide-a2ui-catalog';
import { AppHttpAgent } from './app-http-agent';

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
  state?: () => unknown;
  useServerMemory?: boolean;
}

export function initAgentStore(config: InitAgentStoreConfig): void {
  const copilotKit = inject(CopilotKit);

  const envInjector = inject(EnvironmentInjector);

  const forwardedPropsFor = (): Record<string, unknown> =>
    config.forwardedProps
      ? runInInjectionContext(envInjector, () => config.forwardedProps!())
      : {};

  const stateFor = (): unknown =>
    config.state
      ? runInInjectionContext(envInjector, () => config.state!())
      : undefined;

  const agentConfig = {
    agentId: config.agentId,
    url: config.url,
    threadId: randomUUID(),
  };

  const httpAgent = new AppHttpAgent(agentConfig, {
    forwardedProps: forwardedPropsFor,
    state: config.state ? stateFor : undefined,
    useServerMemory: config.useServerMemory,
  });

  connectCatalogContext(config.agentId);

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
}

function connectCatalogContext(agentId: string): void {
  const catalog = inject(A2UI_CUSTOM_CATALOG, { optional: true });
  if (!catalog) {
    return;
  }

  const sendCatalogDescription =
    inject(A2UI_SEND_CATALOG_DESCRIPTION, { optional: true }) ?? true;

  const entry = sendCatalogDescription
    ? catalogToContextEntry(catalog)
    : catalogIdToContextEntry(catalog.id);

  connectAgentContext(() => ({ ...entry, agentIds: [agentId] }) as Context);
}
