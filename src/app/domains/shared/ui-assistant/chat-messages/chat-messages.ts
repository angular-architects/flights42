import { type Interrupt } from '@ag-ui/core';
import { Component, computed, input, type Signal, signal } from '@angular/core';
import {
  type AgentStore,
  CopilotActivity,
  type Message,
  RENDER_A2UI_TOOL_NAME,
  RenderToolCalls,
} from '@copilotkit/angular';
import { MarkdownComponent } from 'ngx-markdown';

type ActivityMessage = Extract<Message, { role: 'activity' }>;
type AssistantMessage = Extract<Message, { role: 'assistant' }>;

interface ChatToolCallView {
  id: string;
  message: AssistantMessage;
}

interface SuspendPayload {
  options?: unknown;
}

interface InterruptMetadata {
  mastra?: {
    suspendPayload?: SuspendPayload;
  };
}

interface TextPart {
  text: string;
}

interface InterruptOption {
  label: string;
  payload: Record<string, unknown>;
}

interface InterruptModel {
  id: string;
  message: string;
  options: InterruptOption[];
}

const DEFAULT_INTERRUPT_OPTIONS: InterruptOption[] = [
  { label: 'Accept', payload: { approved: true } },
  { label: 'Decline', payload: { approved: false } },
];

interface ChatActivityView {
  message: ActivityMessage;
  isSurface: boolean;
}

interface ChatMessageView {
  id: string;
  variant: 'user' | 'assistant';
  avatar: string;
  text: string;
  activity: ChatActivityView | null;
  toolCalls: ChatToolCallView[];
}

@Component({
  selector: 'app-chat-messages',
  imports: [RenderToolCalls, CopilotActivity, MarkdownComponent],
  templateUrl: './chat-messages.html',
  styleUrls: ['./chat-messages.css'],
})
export class ChatMessages {
  readonly messages = input.required<Message[]>();
  readonly store = input.required<Signal<AgentStore>>();
  readonly agentId = input.required<string>();
  readonly pending = input<boolean>(false);
  readonly greeting = input<string>('Hi! How can I help you?');

  private readonly interruptController = computed(
    () => this.store()().interruptController,
  );
  private readonly resolvedInterruptIds = signal<ReadonlySet<string>>(
    new Set(),
  );

  protected readonly messageViews = computed(() =>
    toMessageViews(this.messages()),
  );

  protected readonly interrupts = computed(() =>
    toInterruptModels(
      this.interruptController().interrupts(),
      this.resolvedInterruptIds(),
    ),
  );

  protected async resolveInterrupt(
    interruptId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.resolvedInterruptIds.update((ids) => new Set([...ids, interruptId]));
    await this.interruptController().resolve(payload, interruptId);
  }
}

function toMessageViews(messages: Message[]): ChatMessageView[] {
  return messages.map((message): ChatMessageView => ({
    id: message.id,
    variant: message.role === 'user' ? 'user' : 'assistant',
    avatar: message.role === 'user' ? '💬' : '🤖',
    text: toMessageText(message),
    activity: getActivity(message),
    toolCalls: toToolCallViews(message),
  }));
}

function getActivity(message: Message): ChatActivityView | null {
  if (message.role !== 'activity') {
    return null;
  }

  return { message, isSurface: message.activityType === 'a2ui-surface' };
}

function toToolCallViews(message: Message): ChatToolCallView[] {
  if (message.role !== 'assistant') {
    return [];
  }

  return (message.toolCalls ?? [])
    .filter((toolCall) => toolCall.function.name !== RENDER_A2UI_TOOL_NAME)
    .map((toolCall) => ({
      id: toolCall.id,
      message: { ...message, toolCalls: [toolCall] },
    }));
}

function toMessageText(message: Message): string {
  const content =
    message.role === 'assistant' || message.role === 'user'
      ? (message.content ?? '')
      : '';

  if (typeof content === 'string') {
    return content;
  }

  return content
    .filter((part) => part.type === 'text')
    .map((part) => (part as TextPart).text)
    .join(' ')
    .trim();
}

function toInterruptModels(
  interrupts: readonly Interrupt[],
  resolvedIds: ReadonlySet<string>,
): InterruptModel[] {
  return interrupts
    .filter((interrupt) => !resolvedIds.has(interrupt.id))
    .map((interrupt) => ({
      id: interrupt.id,
      message: interrupt.message ?? 'Approval needed',
      options: getOptions(interrupt),
    }));
}

function getOptions(interrupt: Interrupt): InterruptOption[] {
  const metadata = interrupt.metadata as InterruptMetadata | undefined;
  const options = metadata?.mastra?.suspendPayload?.options;

  if (Array.isArray(options) && options.length > 0) {
    return options as InterruptOption[];
  }

  return DEFAULT_INTERRUPT_OPTIONS;
}
