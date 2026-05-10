import { type InputContentPart, type UserMessage } from '@ag-ui/core';
import { ResourceRef, Type } from '@angular/core';
import { z } from 'zod';

import { type A2uiCustomCatalogFunction } from './a2ui-schema';

/**
 * Re-export of the AG-UI core `InputContentPart` discriminated union
 * (text / image / audio / video / document / binary). Mirrors the array
 * variant of `UserMessage.content` so consumers of this lib can build
 * multimodal user messages without importing from `@ag-ui/core` directly.
 */
export type UserMessageContentPart = InputContentPart;

/**
 * Content that `agUiResource.sendMessage` accepts for `role: 'user'`.
 * Mirrors `UserMessage['content']` from `@ag-ui/core`: either a plain
 * string or an array of typed content parts (text + image / audio /
 * video / document / binary).
 */
export type UserMessageContent = UserMessage['content'];

export interface AgUiWidget {
  name: string;
  a2uiSurfaceId: string;
}

export interface AgUiToolCall {
  id: string;
  name: string;
  args: unknown;
  status: 'pending' | 'complete' | 'error';
}

/**
 * `attachments` describes non-text parts of a user message (e.g.
 * uploaded images) that should be surfaced to the renderer as a
 * lightweight badge while the structured payload travels separately to
 * the agent. `content` keeps the textual placeholder used for display.
 */
export interface AgUiChatMessageAttachment {
  type: 'image' | 'audio' | 'video' | 'document' | 'binary';
  mimeType?: string;
  /** Optional short label for the badge, e.g. file name. */
  label?: string;
}

export interface AgUiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  widgets: AgUiWidget[];
  toolCalls: AgUiToolCall[];
  attachments?: AgUiChatMessageAttachment[];
}

type ToolExecuteFn<TArgs> = {
  bivarianceHack: (args: TArgs) => Promise<unknown> | unknown;
}['bivarianceHack'];

export interface AgUiClientToolDefinition<TArgs = unknown> {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  parse?: (args: unknown) => unknown;
  execute: ToolExecuteFn<TArgs>;
}

interface AgUiToolWithSchema<TSchema extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: TSchema;
  execute: (args: z.infer<TSchema>) => Promise<unknown> | unknown;
}

interface AgUiToolWithoutSchema {
  name: string;
  description: string;
  execute: () => Promise<unknown> | unknown;
}

export function defineAgUiTool<const TSchema extends z.ZodTypeAny>(
  tool: AgUiToolWithSchema<TSchema>,
): AgUiClientToolDefinition<z.infer<TSchema>>;
export function defineAgUiTool(
  tool: AgUiToolWithoutSchema,
): AgUiClientToolDefinition<void>;
export function defineAgUiTool(
  tool: AgUiToolWithSchema<z.ZodTypeAny> | AgUiToolWithoutSchema,
): AgUiClientToolDefinition {
  if (!('schema' in tool)) {
    return {
      name: tool.name,
      description: tool.description,
      execute: () => tool.execute(),
    };
  }

  return {
    name: tool.name,
    description: tool.description,
    parameters: z.toJSONSchema(tool.schema) as Record<string, unknown>,
    parse: (args) => tool.schema.parse(args),
    execute: (args) => tool.execute(tool.schema.parse(args)),
  };
}

export interface A2uiCustomCatalogComponent {
  name: string;
  description: string;
  component: Type<unknown>;
  schema: z.ZodTypeAny;
}

export interface A2uiCustomCatalog {
  id: string;
  components: A2uiCustomCatalogComponent[];
  functions?: A2uiCustomCatalogFunction[];
}

export interface AgUiResourceOptions {
  url: string;
  tools: AgUiClientToolDefinition<never>[];
  hideInternal?: boolean;
  useServerMemory?: boolean;
  maxLocalTurns?: number;
  model?: string;
}

export interface AgUiChatResourceRef extends ResourceRef<AgUiChatMessage[]> {
  sendMessage: (message: { role: 'user'; content: UserMessageContent }) => void;
  resendMessages: () => void;
  stop: (clearStreamingMessage?: boolean) => void;
  reset: () => void;
  dispose: () => void;
}
