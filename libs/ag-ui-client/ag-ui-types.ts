import type { Types } from '@a2ui/lit/0.8';
import { ResourceRef } from '@angular/core';
import { z } from 'zod';

export interface AgUiWidget {
  name: string;
  /** Traditional Angular component embedding (e.g. showComponent payloads). */
  component?: Type<unknown>;
  props?: Record<string, unknown>;
  /** A2UI surface embedding. */
  a2uiSurfaceId?: string;
  a2uiSurface?: Types.Surface | null;
  a2uiMessages?: unknown[];
}

<<<<<<< HEAD
export type AgUiWidget = AgUiComponentWidget | AgUiA2uiWidget;

export function isAgUiComponentWidget(
  widget: AgUiWidget,
): widget is AgUiComponentWidget {
  return 'component' in widget && 'props' in widget;
}

export function isAgUiA2uiWidget(widget: AgUiWidget): widget is AgUiA2uiWidget {
  return 'a2uiSurfaceId' in widget && 'a2uiSurface' in widget;
}

type NonNeverProperties<TValue> = {
  [TKey in keyof TValue as [TValue[TKey]] extends [never]
    ? never
    : TKey]: TValue[TKey];
};

export type ComponentSignalInputs<TComponent> = NonNeverProperties<
  ɵUnwrapDirectiveSignalInputs<TComponent, keyof TComponent>
>;

type SchemaPropsForComponent<
  TComponent,
  TProps extends Record<string, unknown>,
> = TProps & {
  [TKey in keyof TProps]: TKey extends keyof ComponentSignalInputs<TComponent>
    ? TProps[TKey] extends ComponentSignalInputs<TComponent>[TKey]
      ? TProps[TKey]
      : never
    : never;
};

export interface AgUiRegisteredComponent<
  TComponent = unknown,
  TProps extends Record<string, unknown> = ComponentSignalInputs<TComponent>,
  TName extends string = string,
> {
  name: TName;
  description: string;
  component: Type<TComponent>;
  schema: z.ZodType<TProps>;
}

export function defineAgUiComponent<
  const TName extends string,
  TComponent,
  TProps extends Record<string, unknown> = ComponentSignalInputs<TComponent>,
>(component: {
  name: TName;
  component: Type<TComponent>;
  schema: z.ZodType<SchemaPropsForComponent<TComponent, TProps>>;
}): AgUiRegisteredComponent<TComponent, TProps, TName> {
  return component;
}

=======
>>>>>>> 2b5ab76 (refactor: cleanup a2ui resource, remove ag-ui comp support)
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
<<<<<<< HEAD
  registeredComponents?: readonly AgUiRegisteredComponent[];
  followUpAfterExecution?: boolean;
=======
>>>>>>> 2b5ab76 (refactor: cleanup a2ui resource, remove ag-ui comp support)
  parameters?: Record<string, unknown>;
  parse?: (args: unknown) => unknown;
  execute: ToolExecuteFn<TArgs>;
}

interface AgUiToolWithSchema<TSchema extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: TSchema;
  execute: (args: z.infer<TSchema>) => Promise<unknown> | unknown;
<<<<<<< HEAD
  registeredComponents?: readonly AgUiRegisteredComponent[];
  followUpAfterExecution?: boolean;
=======
>>>>>>> 2b5ab76 (refactor: cleanup a2ui resource, remove ag-ui comp support)
}

interface AgUiToolWithoutSchema {
  name: string;
  description: string;
  execute: () => Promise<unknown> | unknown;
<<<<<<< HEAD
  registeredComponents?: readonly AgUiRegisteredComponent[];
  followUpAfterExecution?: boolean;
=======
>>>>>>> 2b5ab76 (refactor: cleanup a2ui resource, remove ag-ui comp support)
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
<<<<<<< HEAD
      registeredComponents: tool.registeredComponents,
      followUpAfterExecution: tool.followUpAfterExecution ?? true,
=======
>>>>>>> 2b5ab76 (refactor: cleanup a2ui resource, remove ag-ui comp support)
      execute: () => tool.execute(),
    };
  }

  return {
    name: tool.name,
    description: tool.description,
<<<<<<< HEAD
    registeredComponents: tool.registeredComponents,
    followUpAfterExecution: tool.followUpAfterExecution ?? true,
=======
>>>>>>> 2b5ab76 (refactor: cleanup a2ui resource, remove ag-ui comp support)
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
  /**
   * Optional provider for additional `forwardedProps` attached to every
   * AG-UI run. The function is invoked once before each run so
   * signal-backed values (e.g. a "prevent caching" toggle in the UI)
   * are read fresh each time. Values are merged with the built-in
   * `modelHint` (set from `model`); the built-in fields take
   * precedence on key collisions.
   */
  forwardedProps?: () => Record<string, unknown>;
}

export interface AgUiChatResourceRef extends ResourceRef<AgUiChatMessage[]> {
  sendMessage: (message: { role: 'user'; content: UserMessageContent }) => void;
  resendMessages: () => void;
  stop: (clearStreamingMessage?: boolean) => void;
  reset: () => void;
  dispose: () => void;
}
