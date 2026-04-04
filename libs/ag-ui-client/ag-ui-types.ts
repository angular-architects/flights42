import type { Types } from '@a2ui/lit/0.8';
import {
  type ɵUnwrapDirectiveSignalInputs,
  ResourceRef,
  type Type,
} from '@angular/core';
import { z } from 'zod';

/** Rendered via registered Angular components (`app-widget-container`). */
export interface AgUiComponentWidget {
  name: string;
  component: Type<unknown>;
  props: Record<string, unknown>;
}

/** Rendered via A2UI `<a2ui-surface>`. */
export interface AgUiA2uiWidget {
  name: string;
  /** Traditional Angular component embedding (e.g. showComponent payloads). */
  component?: Type<unknown>;
  props?: Record<string, unknown>;
  /** A2UI surface embedding. */
  a2uiSurfaceId?: string;
  a2uiSurface?: Types.Surface | null;
  a2uiMessages?: unknown[];
}

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

export interface AgUiToolCall {
  id: string;
  name: string;
  args: unknown;
  status: 'pending' | 'complete' | 'error';
}

export interface AgUiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  widgets: AgUiWidget[];
  toolCalls: AgUiToolCall[];
}

type ToolExecuteFn<TArgs> = {
  bivarianceHack: (args: TArgs) => Promise<unknown> | unknown;
}['bivarianceHack'];

export interface AgUiClientToolDefinition<TArgs = unknown> {
  name: string;
  description: string;
  registeredComponents?: readonly AgUiRegisteredComponent[];
  followUpAfterExecution?: boolean;
  parameters?: Record<string, unknown>;
  parse?: (args: unknown) => unknown;
  execute: ToolExecuteFn<TArgs>;
}

interface AgUiToolWithSchema<TSchema extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: TSchema;
  execute: (args: z.infer<TSchema>) => Promise<unknown> | unknown;
  registeredComponents?: readonly AgUiRegisteredComponent[];
  followUpAfterExecution?: boolean;
}

interface AgUiToolWithoutSchema {
  name: string;
  description: string;
  execute: () => Promise<unknown> | unknown;
  registeredComponents?: readonly AgUiRegisteredComponent[];
  followUpAfterExecution?: boolean;
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
      registeredComponents: tool.registeredComponents,
      followUpAfterExecution: tool.followUpAfterExecution ?? true,
      execute: () => tool.execute(),
    };
  }

  return {
    name: tool.name,
    description: tool.description,
    registeredComponents: tool.registeredComponents,
    followUpAfterExecution: tool.followUpAfterExecution ?? true,
    parameters: z.toJSONSchema(tool.schema) as Record<string, unknown>,
    parse: (args) => tool.schema.parse(args),
    execute: (args) => tool.execute(tool.schema.parse(args)),
  };
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
  sendMessage: (message: { role: 'user'; content: string }) => void;
  resendMessages: () => void;
  stop: (clearStreamingMessage?: boolean) => void;
  reset: () => void;
  dispose: () => void;
}
