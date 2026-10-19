import { HttpAgent, randomUUID } from '@ag-ui/client';
import { inject } from '@angular/core';
import {
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

import { attachSentFilter, developerMessagesAsUser } from './agent-middlewares';

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
  useServerMemory?: boolean;
}

export function initAgentStore(config: InitAgentStoreConfig): void {
  const copilotKit = inject(CopilotKit);

  const httpAgent = new HttpAgent({
    agentId: config.agentId,
    url: config.url,
    threadId: randomUUID(),
  });

  // Mastra drops 'developer' messages, so send them as 'user' messages
  httpAgent.use(developerMessagesAsUser);
  if (config.useServerMemory) {
    // Server memory already has the history, so only send new messages
    attachSentFilter(httpAgent);
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
