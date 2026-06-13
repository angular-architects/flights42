import { AbstractAgent, EventType, randomUUID } from '@ag-ui/client';
import { convertAGUIMessagesToMastra } from '@ag-ui/mastra';
import { RequestContext } from '@mastra/core/request-context';
import { Observable } from 'rxjs';
import { getMcpAppToolMetadata } from './mcp-apps-registry.js';
import { defaultStore } from './memory-store.js';
import { attachBridge } from './step-bridge.js';
function asRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value;
}
function getNestedRecord(record, key) {
  return asRecord(record?.[key]);
}
function getNestedString(record, key) {
  const value = record?.[key];
  return typeof value === 'string' ? value : undefined;
}
function createToolCallCacheKey(agentId, threadId, toolCallId) {
  return `${agentId}:${threadId}:${toolCallId}`;
}
function buildMcpAppsActivityContent(metadata, toolInput, result) {
  const input = asRecord(toolInput) ?? {};
  const resultRecord = asRecord(result);
  const hasContentArray =
    resultRecord !== undefined && Array.isArray(resultRecord['content']);
  const shapedResult = hasContentArray
    ? resultRecord
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
function readThoughtSignature(value) {
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
function readToolName(value) {
  const record = asRecord(value);
  return getNestedString(record, 'toolName');
}
function finalizeActiveToolCall(
  activeToolCallId,
  activeToolName,
  clientToolNames,
  handlers,
  errorMessage = 'Tool execution finished without a streamed result.',
) {
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
function setThoughtSignature(value, thoughtSignature) {
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
function cacheThoughtSignature(store, agentId, threadId, value) {
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
function rehydrateThoughtSignatures(store, messages, agentId, threadId) {
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
      ...message,
      content: nextContent,
    };
  });
  return nextMessages;
}
function setToolResultName(value, toolName) {
  return {
    ...value,
    toolName,
  };
}
function rehydrateToolResultNames(store, messages, agentId, threadId) {
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
      ...message,
      content: nextContent,
    };
  });
  return nextMessages;
}
function toClientTools(tools) {
  return tools.reduce((result, tool) => {
    result[tool.name] = {
      id: tool.name,
      description: tool.description,
      inputSchema: tool.parameters,
    };
    return result;
  }, {});
}
function isAgUiUserMessage(message) {
  return message.role === 'user';
}
function agUiPartToCorePart(part) {
  if (!part || typeof part !== 'object') {
    return null;
  }
  const record = part;
  if (record['type'] === 'text') {
    const text = record['text'];
    return typeof text === 'string' && text.length > 0
      ? { type: 'text', text }
      : null;
  }
  const source = record['source'];
  if (!source || typeof source !== 'object') {
    return null;
  }
  const sourceRecord = source;
  const sourceType = sourceRecord['type'];
  const value = sourceRecord['value'];
  const mimeType = sourceRecord['mimeType'];
  if (typeof value !== 'string' || !value) {
    return null;
  }
  let resolvedImage;
  try {
    resolvedImage = sourceType === 'url' ? new URL(value) : value;
  } catch {
    resolvedImage = value;
  }
  if (record['type'] === 'image') {
    return {
      type: 'image',
      image: resolvedImage,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
    };
  }
  if (typeof mimeType !== 'string' || !mimeType) {
    return null;
  }
  return {
    type: 'file',
    data: resolvedImage,
    mimeType,
  };
}
function injectMultimodalUserParts(agUiMessages, mastraMessages) {
  if (agUiMessages.length !== mastraMessages.length) {
    return mastraMessages;
  }
  return mastraMessages.map((mastraMessage, index) => {
    const original = agUiMessages[index];
    if (
      !mastraMessage ||
      mastraMessage.role !== 'user' ||
      !isAgUiUserMessage(original) ||
      !Array.isArray(original.content)
    ) {
      return mastraMessage;
    }
    const parts = [];
    for (const part of original.content) {
      const corePart = agUiPartToCorePart(part);
      if (corePart) {
        parts.push(corePart);
      }
    }
    if (parts.length === 0) {
      return mastraMessage;
    }
    return {
      role: 'user',
      content: parts,
    };
  });
}
function getStringField(value, ...keys) {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const v = record[key];
    if (typeof v === 'string' && v.length > 0) {
      return v;
    }
  }
  return undefined;
}
/**
 * Tries to interpret a Mastra stream chunk as a workflow step boundary event.
 *
 * Recognizes both:
 *  - Mastra's auto-emitted lifecycle chunks (`workflow-step-start`,
 *    `workflow-step-result`).
 *  - Our own custom progress chunks emitted via `writer.write({ type:
 *    'data-step-status', stepName, status })` from inside workflow steps.
 *
 * Returns null if the chunk is not a step event we can map to AG-UI.
 */
function parseWorkflowStepChunk(chunk) {
  const record = asRecord(chunk);
  const type =
    typeof record?.['type'] === 'string' ? record['type'] : undefined;
  if (!type) {
    return null;
  }
  const payload = asRecord(record?.['payload']);
  if (type === 'workflow-step-start') {
    const stepName =
      getStringField(payload, 'id', 'stepName') ?? 'workflow-step';
    const stepCallId = getStringField(payload, 'stepCallId', 'id') ?? stepName;
    return { kind: 'started', stepName, stepCallId };
  }
  if (type === 'workflow-step-result') {
    const stepName =
      getStringField(payload, 'id', 'stepName') ?? 'workflow-step';
    const stepCallId = getStringField(payload, 'stepCallId', 'id') ?? stepName;
    return { kind: 'finished', stepName, stepCallId };
  }
  if (type === 'data-step-status') {
    // Custom progress chunk emitted from inside a workflow step via
    // `writer.write({ type: 'data-step-status', stepName, status })`.
    const stepName = getStringField(record, 'stepName');
    const status = getStringField(record, 'status');
    if (!stepName || (status !== 'started' && status !== 'finished')) {
      return null;
    }
    return { kind: status, stepName, stepCallId: stepName };
  }
  return null;
}
function createInterruptId(descriptor) {
  return [descriptor.kind, descriptor.runId, descriptor.toolCallId ?? ''].join(
    ':',
  );
}
function parseInterruptId(value) {
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
function readApproved(value) {
  const record = asRecord(value);
  const approved = record?.['approved'];
  return typeof approved === 'boolean' ? approved : undefined;
}
function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
export class ExtendedMastraAgent extends AbstractAgent {
  agentId;
  agent;
  resourceId;
  requestContext;
  store;
  abortSignal;
  constructor(options) {
    super({ agentId: options.agentId });
    this.agentId = options.agentId;
    this.agent = options.agent;
    this.resourceId = options.resourceId;
    this.requestContext = options.requestContext ?? new RequestContext();
    this.store = options.store ?? defaultStore;
  }
  setAbortSignal(signal) {
    this.abortSignal = signal;
  }
  getAbortSignal() {
    return this.abortSignal;
  }
  clone() {
    return new ExtendedMastraAgent({
      agentId: this.agentId,
      agent: this.agent,
      resourceId: this.resourceId,
      requestContext: this.requestContext,
      store: this.store,
    });
  }
  run(input) {
    return new Observable((observer) => {
      const initialMessageId = randomUUID();
      // Dedup keyed by stepName: events can arrive via three independent
      // paths (Mastra `workflow-step-*` chunks, our custom `data-step-status`
      // chunks, and the per-request RequestContext bridge below). We collapse
      // all of them onto stepName so each step produces exactly one
      // STEP_STARTED + STEP_FINISHED on the wire.
      const startedSteps = new Set();
      const finishedSteps = new Set();
      const emitStep = (event) => {
        if (event.kind === 'started') {
          if (startedSteps.has(event.stepName)) {
            return;
          }
          startedSteps.add(event.stepName);
          observer.next({
            type: EventType.STEP_STARTED,
            stepName: event.stepName,
          });
          return;
        }
        if (finishedSteps.has(event.stepName)) {
          return;
        }
        finishedSteps.add(event.stepName);
        observer.next({
          type: EventType.STEP_FINISHED,
          stepName: event.stepName,
        });
      };
      // Bridge-driven tool calls coming from inside workflow steps. Each
      // call expands into the full AG-UI TOOL_CALL_START / ARGS / END /
      // (optional) RESULT sequence, with the same `parentMessageId` as the
      // surrounding assistant message so the UI groups them naturally.
      const emitBridgeToolCall = (event) => {
        const toolCallId = event.toolCallId ?? randomUUID();
        // `stepName` is a custom field on the wire; AG-UI passes unknown
        // fields through unchanged, and the client picks them up to group
        // tool calls under their parent workflow step.
        observer.next({
          type: EventType.TOOL_CALL_START,
          parentMessageId: initialMessageId,
          toolCallId,
          toolCallName: event.toolName,
          ...(event.stepName ? { stepName: event.stepName } : {}),
        });
        observer.next({
          type: EventType.TOOL_CALL_ARGS,
          toolCallId,
          delta: JSON.stringify(event.args ?? {}),
        });
        observer.next({
          type: EventType.TOOL_CALL_END,
          toolCallId,
        });
        if (event.result !== undefined) {
          observer.next({
            type: EventType.TOOL_CALL_RESULT,
            toolCallId,
            content: JSON.stringify(event.result),
            messageId: randomUUID(),
            role: 'tool',
          });
        }
      };
      // Per-request bridge: workflow steps push progress AND tool calls
      // here; this bypasses Mastra's tool-stream pipe entirely and is
      // isolated per RequestContext.
      const bridge = {
        emit: emitStep,
        emitToolCall: emitBridgeToolCall,
      };
      attachBridge(this.requestContext, bridge);
      const interruptAwareInput = input;
      const startedEvent = {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      };
      observer.next(startedEvent);
      void this.streamMastraAgent(interruptAwareInput, initialMessageId, {
        onTextPart: (delta, messageId) => {
          const textEvent = {
            type: EventType.TEXT_MESSAGE_CHUNK,
            role: 'assistant',
            messageId,
            delta,
          };
          observer.next(textEvent);
        },
        onWorkflowStep: ({ kind, stepName }) => {
          emitStep({ stepName, kind });
        },
        onToolCallPart: ({ toolCallId, toolName, args }) => {
          const startEvent = {
            type: EventType.TOOL_CALL_START,
            parentMessageId: initialMessageId,
            toolCallId,
            toolCallName: toolName,
          };
          observer.next(startEvent);
          const argsEvent = {
            type: EventType.TOOL_CALL_ARGS,
            toolCallId,
            delta: JSON.stringify(args),
          };
          observer.next(argsEvent);
          const endEvent = {
            type: EventType.TOOL_CALL_END,
            toolCallId,
          };
          observer.next(endEvent);
        },
        onToolResultPart: ({ toolCallId, result }) => {
          const resultEvent = {
            type: EventType.TOOL_CALL_RESULT,
            toolCallId,
            content: JSON.stringify(result),
            messageId: randomUUID(),
            role: 'tool',
          };
          observer.next(resultEvent);
        },
        onActivitySnapshot: ({ messageId, activityType, content }) => {
          const activityEvent = {
            type: EventType.ACTIVITY_SNAPSHOT,
            messageId,
            activityType,
            content,
          };
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
          });
          observer.complete();
        },
        onRunFinished: () => {
          const finishedEvent = {
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
    });
  }
  async streamMastraAgent(input, assistantMessageId, handlers) {
    const pendingToolCalls = new Map();
    const mastraMessages = convertAGUIMessagesToMastra(input.messages);
    const multimodalMessages = injectMultimodalUserParts(
      input.messages,
      mastraMessages,
    );
    const rehydratedToolResultNames = rehydrateToolResultNames(
      this.store,
      multimodalMessages,
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
    let activeToolCallId;
    let activeToolName;
    try {
      const stream = await this.createMastraStream(
        input,
        rehydratedMastraMessages,
        clientTools,
      );
      for await (const chunk of stream.fullStream) {
        const stepEvent = parseWorkflowStepChunk(chunk);
        if (stepEvent) {
          handlers.onWorkflowStep(stepEvent);
          continue;
        }
        switch (chunk.type) {
          case 'text-delta':
          case 'reasoning-delta': {
            // Some providers (e.g. OpenAI reasoning) stream the visible answer as
            // reasoning-delta; only handling text-delta drops the AG-UI assistant text.
            const payload = chunk;
            const text = payload.payload?.text;
            if (typeof text === 'string' && text.length > 0) {
              // One stable id per run so TEXT_MESSAGE_CHUNK coalesces into a single assistant
              // message (matches TOOL_CALL_START parentMessageId).
              handlers.onTextPart(text, assistantMessageId);
            }
            break;
          }
          case 'tool-call': {
            const payload = chunk;
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
            const payload = chunk;
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
            const payload = chunk;
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
            const payload = chunk;
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
            const payload = chunk;
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
  async createMastraStream(input, messages, clientTools) {
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
            memory: { thread: input.threadId, resource: this.resourceId },
            clientTools,
            requestContext: this.requestContext,
            abortSignal: this.abortSignal,
          });
        }
        return this.agent.declineToolCall({
          runId: interrupt.runId,
          toolCallId: interrupt.toolCallId,
          memory: { thread: input.threadId, resource: this.resourceId },
          clientTools,
          requestContext: this.requestContext,
          abortSignal: this.abortSignal,
        });
      }
      return this.agent.resumeStream(input.resume?.payload, {
        runId: interrupt.runId,
        toolCallId: interrupt.toolCallId,
        memory: { thread: input.threadId, resource: this.resourceId },
        clientTools,
        requestContext: this.requestContext,
        abortSignal: this.abortSignal,
      });
    }
    // Mastra warns ("No memory is configured but resourceId and threadId were
    // passed in args") when we hand it memory coordinates for an agent without
    // a Memory instance — only set them when the agent actually uses memory.
    const memory = this.agent.hasOwnMemory()
      ? { thread: input.threadId, resource: this.resourceId }
      : undefined;
    return this.agent.stream(messages, {
      memory,
      runId: input.runId,
      clientTools,
      requestContext: this.requestContext,
      abortSignal: this.abortSignal,
    });
  }
}
export function getExtendedLocalAgent(options) {
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
