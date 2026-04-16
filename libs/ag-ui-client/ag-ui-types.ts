import {
  type InputSignal,
  type InputSignalWithTransform,
  ResourceRef,
  type Signal,
  Type,
} from '@angular/core';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export interface AgUiWidget {
  id: string;
  name: string;
  component: Type<unknown>;
}

export interface AgUiActionData<TInput = unknown, TResult = unknown> {
  toolCallId: string;
  toolName: string;
  status: AgUiToolCallStatus;
  input: TInput;
  result?: TResult;
  error?: string;
}

export interface AgUiResultWidget extends AgUiWidget {
  kind?: 'result';
  props: Record<string, unknown>;
}

export interface AgUiActionWidget extends AgUiWidget {
  kind: 'action';
  toolCallId: string;
  data: AgUiActionData;
}

export interface AgUiActionCard<
  TActionData extends AgUiActionData = AgUiActionData,
> {
  actionData: InputSignal<TActionData>;
}

export type AgUiWidgetInstance = AgUiResultWidget | AgUiActionWidget;

export interface AgUiMcpAppsSnapshotContent {
  serverId: string;
  resourceUri: string;
  result: CallToolResult;
  toolInput: Record<string, unknown>;
}

type UnwrapInputSignalWriteType<Field> =
  Field extends InputSignalWithTransform<infer _Read, infer WriteT>
    ? WriteT
    : never;

type UnwrapDirectiveSignalInputs<Dir, Fields extends keyof Dir> = {
  [P in Fields]: UnwrapInputSignalWriteType<Dir[P]>;
};

type NonNeverProperties<TValue> = {
  [TKey in keyof TValue as [TValue[TKey]] extends [never]
    ? never
    : TKey]: TValue[TKey];
};

export type ComponentSignalInputs<TComponent> = NonNeverProperties<
  UnwrapDirectiveSignalInputs<TComponent, keyof TComponent>
>;

type ActionDataInputForComponent<TComponent> =
  ComponentSignalInputs<TComponent> extends {
    actionData: infer TActionData;
  }
    ? TActionData
    : never;

type ActionCardComponentGuard<TComponent> =
  ActionDataInputForComponent<TComponent> extends AgUiActionData
    ? unknown
    : {
        __actionDataError: 'Action components must expose an actionData input typed as AgUiActionData.';
      };

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

export interface AgUiResultRegisteredComponent<
  TComponent = unknown,
  TProps extends Record<string, unknown> = ComponentSignalInputs<TComponent>,
  TName extends string = string,
> {
  kind?: 'result';
  name: TName;
  description: string;
  component: Type<TComponent>;
  schema: z.ZodType<TProps>;
  clientOnly?: true;
}

export interface AgUiActionRegisteredComponent<
  TComponent = unknown,
  TToolName extends string = string,
> {
  kind: 'action';
  name: TToolName;
  component: Type<TComponent>;
  toolName: TToolName;
  clientOnly?: true;
}

export type AgUiRegisteredComponent<
  TComponent = unknown,
  TProps extends Record<string, unknown> = ComponentSignalInputs<TComponent>,
  TName extends string = string,
> =
  | AgUiResultRegisteredComponent<TComponent, TProps, TName>
  | AgUiActionRegisteredComponent<TComponent, TName>;

export function defineAgUiComponent<
  const TName extends string,
  TComponent,
  TProps extends Record<string, unknown> = ComponentSignalInputs<TComponent>,
>(component: {
  name: TName;
  description: string;
  component: Type<TComponent>;
  schema: z.ZodType<SchemaPropsForComponent<TComponent, TProps>>;
  clientOnly?: true;
}): AgUiResultRegisteredComponent<TComponent, TProps, TName>;
export function defineAgUiComponent(component: {
  kind?: 'result';
  name: string;
  description: string;
  component: Type<unknown>;
  schema: z.ZodType<Record<string, unknown>>;
  clientOnly?: true;
}): AgUiRegisteredComponent {
  return component as AgUiRegisteredComponent;
}

export function defineActionCard<const TToolName extends string, TComponent>(
  component: {
    toolName: TToolName;
    component: Type<TComponent>;
    clientOnly?: true;
  } & ActionCardComponentGuard<TComponent>,
): AgUiActionRegisteredComponent<TComponent, TToolName> {
  return {
    kind: 'action',
    name: component.toolName,
    ...component,
  } as AgUiActionRegisteredComponent<TComponent, TToolName>;
}

export type AgUiToolCallStatus = 'pending' | 'interrupt' | 'complete' | 'error';

export interface AgUiToolCall {
  id: string;
  name: string;
  args: unknown;
  status: AgUiToolCallStatus;
  result?: unknown;
  error?: string;
}

export interface AgUiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  widgets: AgUiWidgetInstance[];
  toolCalls: AgUiToolCall[];
}

export interface AgUiInterruptPayload {
  kind: 'approval' | 'suspend';
  toolCallId: string;
  toolName: string;
  args: unknown;
  resumeSchema?: unknown;
  suspendPayload?: unknown;
}

export interface AgUiInterrupt {
  id: string;
  reason: string;
  payload: AgUiInterruptPayload;
}

export interface AgUiResumeRequest {
  interruptId?: string;
  payload?: unknown;
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
  interrupt: Signal<AgUiInterrupt | null>;
  resumeInterrupt: (approved: boolean) => void;
  resendMessages: () => void;
  stop: (clearStreamingMessage?: boolean) => void;
  reset: () => void;
}
