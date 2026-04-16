import { BaseEvent, RunAgentInput } from '@ag-ui/client';
import { AbstractAgent, EventType, randomUUID } from '@ag-ui/client';
import { convertAGUIMessagesToMastra } from '@ag-ui/mastra';
import { Agent } from '@mastra/core/agent';
import { CoreMessage } from '@mastra/core/llm';
import { RequestContext } from '@mastra/core/request-context';
import { Observable } from 'rxjs';

import {
  getMcpAppToolMetadata,
  type McpAppToolMetadata,
} from './mcp-apps-registry.js';
import { Store } from './memory-store.js';
import { defaultStore } from './memory-store.js';

interface ExtendedLocalAgentOptions {
  agentId: string;
  agent: Agent;
  resourceId: string;
  requestContext?: RequestContext;
  store?: Store;
}

interface ClientToolDefinition {
  id: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface InterruptResumeInput {
  interruptId?: string;
  payload?: unknown;
}

interface InterruptAwareRunAgentInput extends RunAgentInput {
  resume?: InterruptResumeInput;
}

type InterruptKind = 'approval' | 'suspend';

interface InterruptDescriptor {
  kind: InterruptKind;
  runId: string;
  toolCallId?: string;
}

interface PendingInterrupt extends InterruptDescriptor {
  toolCallId: string;
  toolName: string;
  args: unknown;
  resumeSchema?: string;
  suspendPayload?: unknown;
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

function buildMcpAppsActivityContent(
  metadata: McpAppToolMetadata,
  toolInput: unknown,
  result: unknown,
): Record<string, unknown> {
  const input = asRecord(toolInput) ?? {};
  const resultRecord = asRecord(result);
  const hasContentArray =
    resultRecord !== undefined && Array.isArray(resultRecord['content']);

  const shapedResult: Record<string, unknown> = hasContentArray
    ? (resultRecord as Record<string, unknown>)
    : {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result ?? null),
          },
        ],
        structuredContent: resultRecord ?? result,
      };

  return {
    serverId: metadata.serverId,
    resourceUri: metadata.resourceUri,
    toolInput: input,
    result: shapedResult,
  };
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

function finalizeActiveToolCall(
  activeToolCallId: string | undefined,
  activeToolName: string | undefined,
  clientToolNames: Set<string>,
  handlers: {
    onToolResultPart: (value: { toolCallId: string; result: unknown }) => void;
  },
  errorMessage = 'Tool execution finished without a streamed result.',
): void {
  if (
    !activeToolCallId ||
    !activeToolName ||
    clientToolNames.has(activeToolName)
  ) {
    return;
  }

  handlers.onToolResultPart({
    toolCallId: activeToolCallId,
    result: { error: errorMessage },
  });
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
  return tools.reduce<Record<string, ClientToolDefinition>>((result, tool) => {
    result[tool.name] = {
      id: tool.name,
      description: tool.description,
      inputSchema: tool.parameters,
    };
    return result;
  }, {});
}

function createInterruptId(descriptor: InterruptDescriptor): string {
  return [descriptor.kind, descriptor.runId, descriptor.toolCallId ?? ''].join(
    ':',
  );
}

function parseInterruptId(
  value: string | undefined,
): InterruptDescriptor | null {
  if (!value) {
    return null;
  }

  const [kind, runId, toolCallId] = value.split(':');
  if (
    (kind !== 'approval' && kind !== 'suspend') ||
    typeof runId !== 'string' ||
    runId.length === 0
  ) {
    return null;
  }

  return {
    kind,
    runId,
    toolCallId: toolCallId || undefined,
  };
}

function readApproved(value: unknown): boolean | undefined {
  const record = asRecord(value);
  const approved = record?.['approved'];
  return typeof approved === 'boolean' ? approved : undefined;
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export class ExtendedMastraAgent extends AbstractAgent {
  override readonly agentId: string;
  readonly agent: Agent;
  readonly resourceId: string;
  readonly requestContext: RequestContext;
  readonly store: Store;

  constructor(options: ExtendedLocalAgentOptions) {
    super({ agentId: options.agentId });
    this.agentId = options.agentId;
    this.agent = options.agent;
    this.resourceId = options.resourceId;
    this.requestContext = options.requestContext ?? new RequestContext();
    this.store = options.store ?? defaultStore;
  }

  override clone(): ExtendedMastraAgent {
    return new ExtendedMastraAgent({
      agentId: this.agentId,
      agent: this.agent,
      resourceId: this.resourceId,
      requestContext: this.requestContext,
      store: this.store,
    });
  }

  override run(input: RunAgentInput): ReturnType<AbstractAgent['run']> {
    return new Observable<BaseEvent>((observer) => {
      const initialMessageId = randomUUID();
      const interruptAwareInput = input as InterruptAwareRunAgentInput;

      const startedEvent: BaseEvent = {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      };
      observer.next(startedEvent);

      void this.streamMastraAgent(interruptAwareInput, initialMessageId, {
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
          const startEvent: BaseEvent = {
            type: EventType.TOOL_CALL_START,
            parentMessageId: initialMessageId,
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
        onToolResultPart: ({ toolCallId, result }) => {
          const resultEvent: BaseEvent = {
            type: EventType.TOOL_CALL_RESULT,
            toolCallId,
            content: JSON.stringify(result),
            messageId: randomUUID(),
            role: 'tool',
          };
          observer.next(resultEvent);
        },
        onActivitySnapshot: ({ messageId, activityType, content }) => {
          const activityEvent: BaseEvent = {
            type: EventType.ACTIVITY_SNAPSHOT,
            messageId,
            activityType,
            content,
          } as BaseEvent;
          observer.next(activityEvent);
        },
        onRunInterrupted: (interrupt) => {
          observer.next({
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
            outcome: 'interrupt',
            interrupt: {
              id: createInterruptId(interrupt),
              reason:
                interrupt.kind === 'approval'
                  ? 'human_approval'
                  : 'tool_suspended',
              payload: {
                kind: interrupt.kind,
                toolCallId: interrupt.toolCallId,
                toolName: interrupt.toolName,
                args: interrupt.args,
                resumeSchema: safeParseJson(interrupt.resumeSchema ?? ''),
                suspendPayload: interrupt.suspendPayload,
              },
            },
          } as BaseEvent);
          observer.complete();
        },
        onRunFinished: () => {
          const finishedEvent: BaseEvent = {
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
            outcome: 'success',
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
    input: InterruptAwareRunAgentInput,
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
        result: unknown;
      }) => void;
      onActivitySnapshot: (value: {
        messageId: string;
        activityType: string;
        content: Record<string, unknown>;
      }) => void;
      onRunInterrupted: (interrupt: PendingInterrupt) => void;
      onRunFinished: () => void;
      onError: (error: unknown) => void;
    },
  ): Promise<void> {
    const pendingToolCalls = new Map<
      string,
      { toolName: string; args: unknown }
    >();
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
    const clientToolNames = new Set(Object.keys(clientTools));

    this.requestContext.set('ag-ui', { context: input.context });

    let activeToolCallId: string | undefined;
    let activeToolName: string | undefined;

    try {
      const stream = await this.createMastraStream(
        input,
        rehydratedMastraMessages,
        clientTools,
      );

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
            activeToolCallId = payload.payload.toolCallId;
            activeToolName = payload.payload.toolName;
            cacheThoughtSignature(
              this.store,
              this.agentId,
              input.threadId,
              payload.payload,
            );
            pendingToolCalls.set(payload.payload.toolCallId, {
              toolName: payload.payload.toolName,
              args: payload.payload.args,
            });
            handlers.onToolCallPart(payload.payload);
            break;
          }
          case 'tool-call-approval': {
            const payload = chunk as {
              payload: {
                toolCallId: string;
                toolName: string;
                args: unknown;
                resumeSchema?: string;
              };
            };
            activeToolCallId = undefined;
            activeToolName = undefined;
            handlers.onRunInterrupted({
              kind: 'approval',
              runId: stream.runId,
              toolCallId: payload.payload.toolCallId,
              toolName: payload.payload.toolName,
              args: payload.payload.args,
              resumeSchema: payload.payload.resumeSchema,
            });
            return;
          }
          case 'tool-call-suspended': {
            const payload = chunk as {
              payload: {
                toolCallId: string;
                toolName: string;
                args: unknown;
                resumeSchema?: string;
                suspendPayload?: unknown;
              };
            };
            activeToolCallId = undefined;
            activeToolName = undefined;
            handlers.onRunInterrupted({
              kind: 'suspend',
              runId: stream.runId,
              toolCallId: payload.payload.toolCallId,
              toolName: payload.payload.toolName,
              args: payload.payload.args,
              resumeSchema: payload.payload.resumeSchema,
              suspendPayload: payload.payload.suspendPayload,
            });
            return;
          }
          case 'tool-result': {
            const payload = chunk as {
              payload: {
                toolCallId: string;
                result: unknown;
              };
            };
            activeToolCallId = undefined;
            activeToolName = undefined;
            handlers.onToolResultPart(payload.payload);

            const pending = pendingToolCalls.get(payload.payload.toolCallId);
            if (pending) {
              const metadata = getMcpAppToolMetadata(pending.toolName);
              if (metadata) {
                handlers.onActivitySnapshot({
                  messageId: assistantMessageId,
                  activityType: 'mcp-apps',
                  content: buildMcpAppsActivityContent(
                    metadata,
                    pending.args,
                    payload.payload.result,
                  ),
                });
              }
              pendingToolCalls.delete(payload.payload.toolCallId);
            }
            break;
          }
          case 'error': {
            const payload = chunk as { payload: { error: string } };
            if (activeToolCallId) {
              finalizeActiveToolCall(
                activeToolCallId,
                activeToolName,
                clientToolNames,
                handlers,
                payload.payload.error,
              );
              handlers.onRunFinished();
              return;
            }

            handlers.onError(new Error(payload.payload.error));
            return;
          }
          case 'finish': {
            finalizeActiveToolCall(
              activeToolCallId,
              activeToolName,
              clientToolNames,
              handlers,
            );
            handlers.onRunFinished();
            return;
          }
        }
      }

      finalizeActiveToolCall(
        activeToolCallId,
        activeToolName,
        clientToolNames,
        handlers,
      );
      handlers.onRunFinished();
    } catch (error) {
      if (activeToolCallId) {
        finalizeActiveToolCall(
          activeToolCallId,
          activeToolName,
          clientToolNames,
          handlers,
          error instanceof Error ? error.message : 'Tool execution failed.',
        );
        handlers.onRunFinished();
        return;
      }

      handlers.onError(error);
    }
  }

  private async createMastraStream(
    input: InterruptAwareRunAgentInput,
    messages: CoreMessage[],
    clientTools: Record<string, ClientToolDefinition>,
  ) {
    const interrupt = parseInterruptId(input.resume?.interruptId);

    if (interrupt) {
      if (interrupt.kind === 'approval') {
        const approved = readApproved(input.resume?.payload);
        if (approved === undefined) {
          throw new Error(
            'Approval resume payload must include an approved boolean.',
          );
        }

        if (approved) {
          return this.agent.approveToolCall({
            runId: interrupt.runId,
            toolCallId: interrupt.toolCallId,
          });
        }

        return this.agent.declineToolCall({
          runId: interrupt.runId,
          toolCallId: interrupt.toolCallId,
        });
      }

      return this.agent.resumeStream(input.resume?.payload, {
        runId: interrupt.runId,
        toolCallId: interrupt.toolCallId,
      });
    }

    return this.agent.stream(messages, {
      memory: { thread: input.threadId, resource: this.resourceId },
      runId: input.runId,
      clientTools,
      requestContext: this.requestContext,
    });
  }
}

export function getExtendedLocalAgent(options: {
  mastra: {
    getAgent: (agentId: string) => Agent | undefined;
  };
  agentId: string;
  resourceId: string;
  requestContext?: RequestContext;
  store?: Store;
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
  });
}
