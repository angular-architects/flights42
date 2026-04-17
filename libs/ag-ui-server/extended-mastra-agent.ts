import { BaseEvent, RunAgentInput } from '@ag-ui/client';
import { AbstractAgent, EventType, randomUUID } from '@ag-ui/client';
import { convertAGUIMessagesToMastra } from '@ag-ui/mastra';
import { Agent } from '@mastra/core/agent';
import { CoreMessage } from '@mastra/core/llm';
import { RequestContext } from '@mastra/core/request-context';
import { Observable } from 'rxjs';

import { SHOW_COMPONENTS_TOOL_NAME } from './create-show-components-tool.js';
import { Store } from './memory-store.js';
import { defaultStore } from './memory-store.js';

/**
 * Tool names that are considered "internal" by default. When
 * `hideInternal` is true (the default), their tool-call / tool-result
 * events are not forwarded to the client. Any A2UI payloads they
 * return are instead emitted as `ACTIVITY_SNAPSHOT` events.
 */
export const DEFAULT_INTERNAL_TOOL_NAMES: readonly string[] = [
  SHOW_COMPONENTS_TOOL_NAME,
];

interface ExtendedLocalAgentOptions {
  agentId: string;
  agent: Agent;
  resourceId: string;
  requestContext?: RequestContext;
  store?: Store;
  /**
   * Hide `internalToolNames` tool calls/results from the AG-UI event
   * stream. Defaults to `true`.
   */
  hideInternal?: boolean;
  /**
   * Tool names treated as internal. Defaults to
   * `DEFAULT_INTERNAL_TOOL_NAMES` (i.e. `showComponents`).
   */
  internalToolNames?: readonly string[];
}

interface ClientToolDefinition {
  id: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as UnknownRecord;
}

function getNestedRecord(
  record: UnknownRecord | undefined,
  key: string,
): UnknownRecord | undefined {
  return asRecord(record?.[key]);
}

function getNestedString(
  record: UnknownRecord | undefined,
  key: string,
): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' ? value : undefined;
}

function createToolCallCacheKey(
  agentId: string,
  threadId: string,
  toolCallId: string,
): string {
  return `${agentId}:${threadId}:${toolCallId}`;
}

function readThoughtSignature(value: unknown): string | undefined {
  const record = asRecord(value);
  const googleMetadata = getNestedRecord(
    getNestedRecord(record, 'providerMetadata'),
    'google',
  );
  const googleOptions = getNestedRecord(
    getNestedRecord(record, 'providerOptions'),
    'google',
  );

  return (
    getNestedString(googleMetadata, 'thoughtSignature') ??
    getNestedString(googleOptions, 'thoughtSignature')
  );
}

function readToolName(value: unknown): string | undefined {
  const record = asRecord(value);
  return getNestedString(record, 'toolName');
}

function setThoughtSignature(
  value: UnknownRecord,
  thoughtSignature: string,
): UnknownRecord {
  const providerOptions = getNestedRecord(value, 'providerOptions') ?? {};
  const googleOptions = getNestedRecord(providerOptions, 'google') ?? {};

  return {
    ...value,
    providerOptions: {
      ...providerOptions,
      google: {
        ...googleOptions,
        thoughtSignature,
      },
    },
  };
}

function cacheThoughtSignature(
  store: Store,
  agentId: string,
  threadId: string,
  value: unknown,
): void {
  const record = asRecord(value);
  const toolCallId = getNestedString(record, 'toolCallId');
  const thoughtSignature = readThoughtSignature(record);
  const toolName = readToolName(record);

  if (!toolCallId) {
    return;
  }

  const cacheKey = createToolCallCacheKey(agentId, threadId, toolCallId);

  if (thoughtSignature) {
    store.set(cacheKey, { thoughtSignature });
  }

  if (toolName) {
    store.set(cacheKey, { toolName });
  }
}

function rehydrateThoughtSignatures(
  store: Store,
  messages: CoreMessage[],
  agentId: string,
  threadId: string,
): CoreMessage[] {
  const nextMessages = messages.map((message) => {
    const messageRecord = asRecord(message);
    if (!messageRecord || messageRecord['role'] !== 'assistant') {
      return message;
    }

    const content = messageRecord['content'];
    if (!Array.isArray(content)) {
      return message;
    }

    let changed = false;
    const nextContent = content.map((part) => {
      const partRecord = asRecord(part);
      if (!partRecord || partRecord['type'] !== 'tool-call') {
        return part;
      }

      if (readThoughtSignature(partRecord)) {
        return part;
      }

      const toolCallId = getNestedString(partRecord, 'toolCallId');
      if (!toolCallId) {
        return part;
      }

      const cachedThoughtSignature = store.get(
        createToolCallCacheKey(agentId, threadId, toolCallId),
      )?.thoughtSignature;

      if (!cachedThoughtSignature) {
        return part;
      }

      changed = true;

      return setThoughtSignature(partRecord, cachedThoughtSignature);
    });

    if (!changed) {
      return message;
    }

    return {
      ...(message as UnknownRecord),
      content: nextContent,
    } as CoreMessage;
  });

  return nextMessages;
}

function setToolResultName(
  value: UnknownRecord,
  toolName: string,
): UnknownRecord {
  return {
    ...value,
    toolName,
  };
}

function rehydrateToolResultNames(
  store: Store,
  messages: CoreMessage[],
  agentId: string,
  threadId: string,
): CoreMessage[] {
  const nextMessages = messages.map((message) => {
    const messageRecord = asRecord(message);
    if (!messageRecord || messageRecord['role'] !== 'tool') {
      return message;
    }

    const content = messageRecord['content'];
    if (!Array.isArray(content)) {
      return message;
    }

    let changed = false;
    const nextContent = content.map((part) => {
      const partRecord = asRecord(part);
      if (!partRecord || partRecord['type'] !== 'tool-result') {
        return part;
      }

      const toolName = readToolName(partRecord);
      if (toolName && toolName !== 'unknown') {
        return part;
      }

      const toolCallId = getNestedString(partRecord, 'toolCallId');
      if (!toolCallId) {
        return part;
      }

      const cachedToolName = store.get(
        createToolCallCacheKey(agentId, threadId, toolCallId),
      )?.toolName;

      if (!cachedToolName) {
        return part;
      }

      changed = true;

      return setToolResultName(partRecord, cachedToolName);
    });

    if (!changed) {
      return message;
    }

    return {
      ...(message as UnknownRecord),
      content: nextContent,
    } as CoreMessage;
  });

  return nextMessages;
}

function toClientTools(
  tools: RunAgentInput['tools'],
): Record<string, ClientToolDefinition> {
  return (tools ?? []).reduce<Record<string, ClientToolDefinition>>(
    (result, tool) => {
      result[tool.name] = {
        id: tool.name,
        description: tool.description,
        inputSchema: tool.parameters,
      };
      return result;
    },
    {},
  );
}

export class ExtendedMastraAgent extends AbstractAgent {
  override readonly agentId: string;
  readonly agent: Agent;
  readonly resourceId: string;
  readonly requestContext: RequestContext;
  readonly store: Store;
  readonly hideInternal: boolean;
  readonly internalToolNames: ReadonlySet<string>;

  constructor(options: ExtendedLocalAgentOptions) {
    super({ agentId: options.agentId });
    this.agentId = options.agentId;
    this.agent = options.agent;
    this.resourceId = options.resourceId;
    this.requestContext = options.requestContext ?? new RequestContext();
    this.store = options.store ?? defaultStore;
    this.hideInternal = options.hideInternal ?? true;
    this.internalToolNames = new Set(
      options.internalToolNames ?? DEFAULT_INTERNAL_TOOL_NAMES,
    );
  }

  override clone(): ExtendedMastraAgent {
    return new ExtendedMastraAgent({
      agentId: this.agentId,
      agent: this.agent,
      resourceId: this.resourceId,
      requestContext: this.requestContext,
      store: this.store,
      hideInternal: this.hideInternal,
      internalToolNames: [...this.internalToolNames],
    });
  }

  private isInternalTool(toolName: string | undefined): boolean {
    return (
      this.hideInternal &&
      typeof toolName === 'string' &&
      this.internalToolNames.has(toolName)
    );
  }

  override run(input: RunAgentInput): ReturnType<AbstractAgent['run']> {
    return new Observable<BaseEvent>((observer) => {
      const initialMessageId = randomUUID();

      const startedEvent: BaseEvent = {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      };
      observer.next(startedEvent);

      void this.streamMastraAgent(input, initialMessageId, {
        onTextPart: (delta, messageId) => {
          const textEvent: BaseEvent = {
            type: EventType.TEXT_MESSAGE_CHUNK,
            role: 'assistant',
            messageId,
            delta,
          };
          observer.next(textEvent);
        },
        onToolCallPart: ({ toolCallId, toolName, args }) => {
          if (this.isInternalTool(toolName)) {
            return;
          }

          // Each tool call gets its own parentMessageId so the client
          // renders it as a separate chat message instead of grouping
          // multiple tool calls under the same assistant message.
          const startEvent: BaseEvent = {
            type: EventType.TOOL_CALL_START,
            parentMessageId: randomUUID(),
            toolCallId,
            toolCallName: toolName,
          };
          observer.next(startEvent);

          const argsEvent: BaseEvent = {
            type: EventType.TOOL_CALL_ARGS,
            toolCallId,
            delta: JSON.stringify(args),
          };
          observer.next(argsEvent);

          const endEvent: BaseEvent = {
            type: EventType.TOOL_CALL_END,
            toolCallId,
          };
          observer.next(endEvent);
        },
        onToolResultPart: ({ toolCallId, toolName, result }) => {
          const a2uiPayload = extractA2uiSurfacePayload(result);
          const internal = this.isInternalTool(toolName);

          if (a2uiPayload) {
            const snapshotEvent: BaseEvent = {
              type: EventType.ACTIVITY_SNAPSHOT,
              messageId: toolCallId,
              activityType: 'a2ui-surface',
              content: { operations: a2uiPayload.messages },
            };
            observer.next(snapshotEvent);

            if (internal) {
              return;
            }

            const resultEvent: BaseEvent = {
              type: EventType.TOOL_CALL_RESULT,
              toolCallId,
              content: JSON.stringify({
                ok: true,
                surfaceId: a2uiPayload.surfaceId,
              }),
              messageId: randomUUID(),
              role: 'tool',
            };
            observer.next(resultEvent);
            return;
          }

          if (internal) {
            return;
          }

          const resultEvent: BaseEvent = {
            type: EventType.TOOL_CALL_RESULT,
            toolCallId,
            content: JSON.stringify(result),
            messageId: randomUUID(),
            role: 'tool',
          };
          observer.next(resultEvent);
        },
        onRunFinished: () => {
          const finishedEvent: BaseEvent = {
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
          };
          observer.next(finishedEvent);
          observer.complete();
        },
        onError: (error) => {
          observer.error(error);
        },
      });
    }) as unknown as ReturnType<AbstractAgent['run']>;
  }

  private async streamMastraAgent(
    input: RunAgentInput,
    assistantMessageId: string,
    handlers: {
      onTextPart: (delta: string, messageId: string) => void;
      onToolCallPart: (value: {
        toolCallId: string;
        toolName: string;
        args: unknown;
      }) => void;
      onToolResultPart: (value: {
        toolCallId: string;
        toolName?: string;
        result: unknown;
      }) => void;
      onRunFinished: () => void;
      onError: (error: unknown) => void;
    },
  ): Promise<void> {
    const mastraMessages = convertAGUIMessagesToMastra(input.messages as never);
    const rehydratedToolResultNames = rehydrateToolResultNames(
      this.store,
      mastraMessages as CoreMessage[],
      this.agentId,
      input.threadId,
    );
    const rehydratedMastraMessages = rehydrateThoughtSignatures(
      this.store,
      rehydratedToolResultNames,
      this.agentId,
      input.threadId,
    );
    const clientTools = toClientTools(input.tools);

    this.requestContext.set('ag-ui', { context: input.context });

    const toolCallNames = new Map<string, string>();

    try {
      const stream = await this.agent.stream(rehydratedMastraMessages, {
        memory: { thread: input.threadId, resource: this.resourceId },
        runId: input.runId,
        clientTools,
        requestContext: this.requestContext,
      });

      for await (const chunk of stream.fullStream) {
        switch ((chunk as { type?: string }).type) {
          case 'text-delta':
          case 'reasoning-delta': {
            // Some providers (e.g. OpenAI reasoning) stream the visible answer as
            // reasoning-delta; only handling text-delta drops the AG-UI assistant text.
            const payload = chunk as { payload?: { text?: string } };
            const text = payload.payload?.text;
            if (typeof text === 'string' && text.length > 0) {
              // One stable id per run so TEXT_MESSAGE_CHUNK coalesces into a single assistant
              // message (matches TOOL_CALL_START parentMessageId).
              handlers.onTextPart(text, assistantMessageId);
            }
            break;
          }
          case 'tool-call': {
            const payload = chunk as {
              payload: {
                toolCallId: string;
                toolName: string;
                args: unknown;
                providerMetadata?: UnknownRecord;
              };
            };
            cacheThoughtSignature(
              this.store,
              this.agentId,
              input.threadId,
              payload.payload,
            );
            toolCallNames.set(
              payload.payload.toolCallId,
              payload.payload.toolName,
            );
            handlers.onToolCallPart(payload.payload);
            break;
          }
          case 'tool-result': {
            const payload = chunk as {
              payload: {
                toolCallId: string;
                result: unknown;
              };
            };
            handlers.onToolResultPart({
              ...payload.payload,
              toolName: toolCallNames.get(payload.payload.toolCallId),
            });
            break;
          }
          case 'error': {
            const payload = chunk as { payload: { error: string } };
            handlers.onError(new Error(payload.payload.error));
            return;
          }
          case 'finish': {
            handlers.onRunFinished();
            return;
          }
        }
      }

      handlers.onRunFinished();
    } catch (error) {
      handlers.onError(error);
    }
  }
}

function extractA2uiSurfacePayload(
  result: unknown,
): { surfaceId: string; messages: unknown[] } | null {
  if (!result || typeof result !== 'object') {
    return null;
  }
  const candidate = result as {
    surfaceId?: unknown;
    messages?: unknown;
  };
  if (
    typeof candidate.surfaceId !== 'string' ||
    !Array.isArray(candidate.messages)
  ) {
    return null;
  }
  return {
    surfaceId: candidate.surfaceId,
    messages: candidate.messages,
  };
}

export function getExtendedLocalAgent(options: {
  mastra: {
    getAgent: (agentId: string) => Agent | undefined;
  };
  agentId: string;
  resourceId: string;
  requestContext?: RequestContext;
  store?: Store;
  hideInternal?: boolean;
  internalToolNames?: readonly string[];
}): AbstractAgent {
  const agent = options.mastra.getAgent(options.agentId);
  if (!agent) {
    throw new Error(`Agent ${options.agentId} not found`);
  }

  return new ExtendedMastraAgent({
    agentId: options.agentId,
    agent,
    resourceId: options.resourceId,
    requestContext: options.requestContext,
    store: options.store,
    hideInternal: options.hideInternal,
    internalToolNames: options.internalToolNames,
  });
}
