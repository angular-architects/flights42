import { ResourceRef, Type } from '@angular/core';

export interface AgUiWidget {
  name: string;
  component: Type<unknown>;
  props: Record<string, unknown>;
}

export interface AgUiRegisteredComponent {
  name: string;
  component: Type<unknown>;
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

export interface AgUiClientToolDefinition<TArgs = unknown> {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  execute: (args: TArgs) => Promise<unknown> | unknown;
}

export interface AgUiResourceOptions {
  url: string;
  tools: AgUiClientToolDefinition[];
  components: AgUiRegisteredComponent[];
  model?: string;
}

export interface AgUiChatResourceRef extends ResourceRef<AgUiChatMessage[]> {
  sendMessage: (message: { role: 'user'; content: string }) => void;
  resendMessages: () => void;
  stop: (clearStreamingMessage?: boolean) => void;
}
