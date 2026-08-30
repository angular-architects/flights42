import type { Message } from '@ag-ui/core';
import type { CoreMessage } from '@mastra/core/llm';

type UserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string | URL; mimeType?: string }
  | { type: 'file'; data: string | URL; mimeType: string };

type AssistantContentPart =
  | { type: 'text'; text: string }
  | {
      type: 'tool-call';
      toolCallId: string;
      toolName: string;
      args: unknown;
    };

export type ToolNameLookup = (toolCallId: string) => string | undefined;

function textOf(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((part) => {
      const record = part as { type?: unknown; text?: unknown };
      return record.type === 'text' && typeof record.text === 'string'
        ? record.text
        : '';
    })
    .filter((text) => text.length > 0)
    .join('\n');
}

function safeParseArgs(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function toUserPart(part: unknown): UserContentPart | null {
  if (!part || typeof part !== 'object') {
    return null;
  }
  const record = part as Record<string, unknown>;
  if (record['type'] === 'text') {
    const text = record['text'];
    return typeof text === 'string' && text.length > 0
      ? { type: 'text', text }
      : null;
  }

  if (record['type'] === 'binary') {
    const url = record['url'];
    const data = record['data'];
    const mimeType = record['mimeType'];
    if (typeof url === 'string' && url) {
      return { type: 'image', image: url };
    }
    if (typeof data === 'string' && data && typeof mimeType === 'string') {
      return { type: 'image', image: `data:${mimeType};base64,${data}` };
    }
    return null;
  }

  const source = record['source'];
  if (!source || typeof source !== 'object') {
    return null;
  }
  const sourceRecord = source as Record<string, unknown>;
  const value = sourceRecord['value'];
  const mimeType = sourceRecord['mimeType'];
  if (typeof value !== 'string' || !value) {
    return null;
  }

  let resolved: string | URL = value;
  if (sourceRecord['type'] === 'url') {
    try {
      resolved = new URL(value);
    } catch {
      resolved = value;
    }
  }

  if (record['type'] === 'image') {
    return {
      type: 'image',
      image: resolved,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
    };
  }

  if (typeof mimeType !== 'string' || !mimeType) {
    return null;
  }
  return { type: 'file', data: resolved, mimeType };
}

function toUserContent(content: unknown): string | UserContentPart[] {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  const parts: UserContentPart[] = [];
  for (const part of content) {
    const converted = toUserPart(part);
    if (converted) {
      parts.push(converted);
    }
  }
  return parts;
}

function findToolName(
  messages: readonly Message[],
  toolCallId: string,
  lookup: ToolNameLookup | undefined,
): string {
  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue;
    }
    for (const toolCall of message.toolCalls ?? []) {
      if (toolCall.id === toolCallId) {
        return toolCall.function.name;
      }
    }
  }
  return lookup?.(toolCallId) ?? 'unknown';
}

export function convertAgUiMessages(
  messages: readonly Message[],
  lookupToolName?: ToolNameLookup,
): CoreMessage[] {
  const result: CoreMessage[] = [];

  for (const message of messages) {
    if (message.role === 'assistant') {
      const parts: AssistantContentPart[] = [];
      const text = textOf(message.content);
      if (text) {
        parts.push({ type: 'text', text });
      }
      for (const toolCall of message.toolCalls ?? []) {
        parts.push({
          type: 'tool-call',
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          args: safeParseArgs(toolCall.function.arguments),
        });
      }
      result.push({ role: 'assistant', content: parts } as CoreMessage);
      continue;
    }

    if (message.role === 'user' || message.role === 'developer') {
      result.push({
        role: 'user',
        content: toUserContent(message.content),
      } as CoreMessage);
      continue;
    }

    if (message.role === 'system') {
      result.push({
        role: 'system',
        content: textOf(message.content),
      } as CoreMessage);
      continue;
    }

    if (message.role === 'tool') {
      result.push({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: message.toolCallId,
            toolName: findToolName(
              messages,
              message.toolCallId,
              lookupToolName,
            ),
            result: message.content,
            isError: Boolean(message.error),
          },
        ],
      } as CoreMessage);
    }
  }

  return result;
}
