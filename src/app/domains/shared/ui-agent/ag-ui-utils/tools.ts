import { type HttpAgent, type Message, randomUUID } from '@ag-ui/client';
import {
  EnvironmentInjector,
  type ResourceStreamItem,
  runInInjectionContext,
  type WritableSignal,
} from '@angular/core';

import {
  type AgUiChatMessage,
  type AgUiClientToolDefinition,
  type AgUiRegisteredComponent,
} from '../ag-ui-types';
import { completeToolCall, readMessages, updateToolCall } from './messages';
import { appendWidgetsFromPendingToolResult } from './widgets';

export interface PendingRun {
  id: string;
}

export interface PendingToolExecution {
  toolCallId: string;
  toolCallName: string;
  toolCallArgs: Record<string, unknown>;
}

interface ExecutePendingToolsOptions {
  agent: HttpAgent;
  toolMap: Map<string, AgUiClientToolDefinition<never>>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  environmentInjector: EnvironmentInjector;
  pendingLocalCalls: PendingToolExecution[];
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

interface ExecuteToolOptions {
  agent: HttpAgent;
  tool: AgUiClientToolDefinition<never>;
  componentMap: Map<string, AgUiRegisteredComponent>;
  environmentInjector: EnvironmentInjector;
  pendingCall: PendingToolExecution;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

interface RecordToolErrorOptions {
  agent: HttpAgent;
  pendingCall: PendingToolExecution;
  error: unknown;
  messageStream: WritableSignal<ResourceStreamItem<AgUiChatMessage[]>>;
}

export function readRegisteredComponents(
  tools: AgUiClientToolDefinition<never>[],
): AgUiRegisteredComponent[] {
  return tools.flatMap((tool) => tool.registeredComponents ?? []);
}

export async function executePendingTools(
  options: ExecutePendingToolsOptions,
): Promise<boolean> {
  const {
    agent,
    toolMap,
    componentMap,
    environmentInjector,
    pendingLocalCalls,
    messageStream,
  } = options;

  let executedAnyTool = false;

  for (const pendingCall of pendingLocalCalls) {
    const tool = toolMap.get(pendingCall.toolCallName);
    if (!tool || hasToolResult(agent.messages, pendingCall.toolCallId)) {
      continue;
    }

    executedAnyTool = true;
    try {
      await executeTool({
        agent,
        tool,
        componentMap,
        environmentInjector,
        pendingCall,
        messageStream,
      });
    } catch (error) {
      recordToolError({
        agent,
        pendingCall,
        error,
        messageStream,
      });
    }
  }

  return executedAnyTool;
}

async function executeTool(options: ExecuteToolOptions): Promise<void> {
  const {
    agent,
    tool,
    componentMap,
    environmentInjector,
    pendingCall,
    messageStream,
  } = options;

  const result = await runInInjectionContext(environmentInjector, () =>
    tool.execute(pendingCall.toolCallArgs as never),
  );
  const serializedResult = JSON.stringify(result ?? null);

  agent.addMessage({
    id: randomUUID(),
    role: 'tool',
    toolCallId: pendingCall.toolCallId,
    content: serializedResult,
  });

  messageStream.update((item) => ({
    value: appendWidgetsFromPendingToolResult(
      completeToolCall(readMessages(item), pendingCall.toolCallId),
      pendingCall,
      serializedResult,
      componentMap,
    ),
  }));
}

function recordToolError(options: RecordToolErrorOptions): void {
  const { agent, pendingCall, error, messageStream } = options;
  const message =
    error instanceof Error ? error.message : 'Tool execution failed';

  if (pendingCall.toolCallName === 'showComponent') {
    console.error('AG-UI showComponent call rejected', {
      toolCallId: pendingCall.toolCallId,
      args: pendingCall.toolCallArgs,
      error,
    });
  }

  agent.addMessage({
    id: randomUUID(),
    role: 'tool',
    toolCallId: pendingCall.toolCallId,
    content: JSON.stringify({ error: message }),
    error: message,
  });

  messageStream.update((item) => ({
    value: updateToolCall(readMessages(item), pendingCall.toolCallId, {
      status: 'error',
    }),
  }));
}

function hasToolResult(messages: Message[], toolCallId: string): boolean {
  return messages.some(
    (message) => message.role === 'tool' && message.toolCallId === toolCallId,
  );
}
