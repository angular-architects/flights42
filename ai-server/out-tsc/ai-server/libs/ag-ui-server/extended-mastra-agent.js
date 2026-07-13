import { AbstractAgent, EventType, randomUUID } from '@ag-ui/client';
import { convertAGUIMessagesToMastra } from '@ag-ui/mastra';
import { RequestContext } from '@mastra/core/request-context';
import { Observable } from 'rxjs';

import { SHOW_COMPONENTS_TOOL_NAME } from './create-show-components-tool.js';
import { defaultStore } from './memory-store.js';
import { RENDER_A2UI_TOOL_NAME } from './render-a2ui-tool.js';
/**
 * Tool names that are considered "internal" by default. When
 * `hideInternal` is true (the default), their tool-call / tool-result
 * events are not forwarded to the client. Any A2UI payloads they
 * return are instead emitted as `ACTIVITY_SNAPSHOT` events.
 */
export const DEFAULT_INTERNAL_TOOL_NAMES = [
  SHOW_COMPONENTS_TOOL_NAME,
  RENDER_A2UI_TOOL_NAME,
];
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
  // image / audio / video / document / binary all share the same
  // `{ source: { type: 'data' | 'url', value, mimeType? } }` shape in
  // AG-UI core. We map images to AI-SDK `ImagePart` and the rest to
  // `FilePart` (audio/video/files) — the OpenAI provider with vision
  // (`gpt-5.3-chat-latest`) consumes ImagePart natively.
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
  // Treat audio/video/document/binary as opaque files. Most providers
  // ignore non-image attachments, but we forward them so vision-capable
  // multimodal models (and future providers) can pick them up.
  if (typeof mimeType !== 'string' || !mimeType) {
    return null;
  }
  return {
    type: 'file',
    data: resolvedImage,
    mimeType,
  };
}
/**
 * Walk the produced `CoreMessage[]` in parallel with the original
 * AG-UI `Message[]` and rewrite each user message whose AG-UI content
 * was an array (containing non-text parts) into a Mastra/AI-SDK-style
 * multipart user message. String-only AG-UI user messages are left
 * untouched.
 */
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
    // Force `unknown` cast: AI-SDK's `UserContent` is a strict union,
    // but Mastra accepts these parts at runtime; the bridge would have
    // produced the same shape if it supported images.
    return {
      role: 'user',
      content: parts,
    };
  });
}
function toClientTools(tools) {
  return (tools ?? []).reduce((result, tool) => {
    result[tool.name] = {
      id: tool.name,
      description: tool.description,
      inputSchema: tool.parameters,
    };
    return result;
  }, {});
}
export class ExtendedMastraAgent extends AbstractAgent {
  agentId;
  agent;
  resourceId;
  requestContext;
  store;
  hideInternal;
  internalToolNames;
  constructor(options) {
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
  clone() {
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
  isInternalTool(toolName) {
    return (
      this.hideInternal &&
      typeof toolName === 'string' &&
      this.internalToolNames.has(toolName)
    );
  }
  run(input) {
    return new Observable((observer) => {
      const initialMessageId = randomUUID();
      const startedEvent = {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      };
      observer.next(startedEvent);
      void this.streamMastraAgent(input, initialMessageId, {
        onTextPart: (delta, messageId) => {
          const textEvent = {
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
          const startEvent = {
            type: EventType.TOOL_CALL_START,
            parentMessageId: randomUUID(),
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
        onToolResultPart: ({ toolCallId, toolName, result }) => {
          const a2uiPayload = extractA2uiSurfacePayload(result);
          const internal = this.isInternalTool(toolName);
          if (a2uiPayload) {
            const snapshotEvent = {
              type: EventType.ACTIVITY_SNAPSHOT,
              messageId: toolCallId,
              activityType: 'a2ui-surface',
              content: { operations: a2uiPayload.messages },
            };
            observer.next(snapshotEvent);
            if (internal) {
              return;
            }
            const resultEvent = {
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
          const resultEvent = {
            type: EventType.TOOL_CALL_RESULT,
            toolCallId,
            content: JSON.stringify(result),
            messageId: randomUUID(),
            role: 'tool',
          };
          observer.next(resultEvent);
        },
        onRunFinished: () => {
          const finishedEvent = {
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
    });
  }
  async streamMastraAgent(input, assistantMessageId, handlers) {
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
    this.requestContext.set('ag-ui', { context: input.context });
    const toolCallNames = new Map();
    try {
      // Only pass `memory` for agents that actually have memory configured.
      // Mastra emits a runtime warning ("No memory is configured but
      // resourceId and threadId were passed in args") when `memory` is
      // supplied to a memory-less agent — its own internal check uses
      // `hasOwnMemory()` (see `@mastra/core/dist/agent/agent.d.ts`), so
      // we mirror that here.
      const baseStreamOptions = {
        runId: input.runId,
        clientTools,
        requestContext: this.requestContext,
      };
      const stream = await this.agent.stream(
        rehydratedMastraMessages,
        this.agent.hasOwnMemory()
          ? {
              ...baseStreamOptions,
              memory: { thread: input.threadId, resource: this.resourceId },
            }
          : baseStreamOptions,
      );
      for await (const chunk of stream.fullStream) {
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
            const payload = chunk;
            const resolvedToolName = toolCallNames.get(
              payload.payload.toolCallId,
            );
            handlers.onToolResultPart({
              ...payload.payload,
              toolName: resolvedToolName,
            });
            break;
          }
          case 'error': {
            const payload = chunk;
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
function extractA2uiSurfacePayload(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }
  const candidate = result;
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
    hideInternal: options.hideInternal,
    internalToolNames: options.internalToolNames,
  });
}
