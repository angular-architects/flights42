import { type Interrupt } from '@ag-ui/core';
import { JsonPipe } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { type Message, RenderToolCalls } from '@copilotkit/angular';

import { CopilotActivity } from '../copilot/activity/copilot-activity';
import { MessageComponent } from '../message';

type ActivityMessage = Extract<Message, { role: 'activity' }>;
type AssistantMessage = Extract<Message, { role: 'assistant' }>;

interface ChatToolCallView {
  id: string;
  message: AssistantMessage;
}

interface SuspendPayload {
  message?: unknown;
  options?: unknown;
}

interface InterruptMetadata {
  suspendPayload?: SuspendPayload;
}

interface TextPart {
  text: string;
}

interface InterruptOption {
  id: string;
  label: string;
  payload: Record<string, unknown>;
}

interface InterruptModel {
  id: string;
  message: string;
  options: InterruptOption[];
}

const DEFAULT_INTERRUPT_OPTIONS: InterruptOption[] = [
  { id: 'accept', label: 'Accept', payload: { approved: true } },
  { id: 'decline', label: 'Decline', payload: { approved: false } },
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
  imports: [RenderToolCalls, CopilotActivity, MessageComponent, JsonPipe],
  templateUrl: './chat-messages.html',
  styleUrls: ['./chat-messages.css'],
})
export class ChatMessages {
  readonly messages = input.required<Message[]>();
  readonly agentId = input.required<string>();
  readonly pending = input<boolean>(false);
  readonly greeting = input<string>('Hi! How can I help you?');
  readonly pendingInterrupts = input<Interrupt[]>([]);
  readonly resumeInterrupt = output<Record<string, unknown>>();

  private readonly resolvedInterruptId = signal<string | null>(null);

  protected readonly views = computed(() => toMessageViews(this.messages()));

  protected readonly interrupts = computed(() =>
    toInterruptModels(this.pendingInterrupts(), this.resolvedInterruptId()),
  );

  protected resolveInterrupt(
    interruptId: string,
    payload: Record<string, unknown>,
  ): void {
    this.resolvedInterruptId.set(interruptId);
    this.resumeInterrupt.emit(payload);
  }
}

function toMessageViews(messages: Message[]): ChatMessageView[] {
  return messages.map(
    (message): ChatMessageView => ({
      id: message.id,
      variant: message.role === 'user' ? 'user' : 'assistant',
      avatar: message.role === 'user' ? '💬' : '🤖',
      text: toMessageText(message),
      activity:
        message.role === 'activity'
          ? { message, isSurface: message.activityType === 'a2ui-surface' }
          : null,
      toolCalls:
        message.role === 'assistant'
          ? (message.toolCalls ?? []).map((toolCall) => ({
              id: toolCall.id,
              message: { ...message, toolCalls: [toolCall] },
            }))
          : [],
    }),
  );
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
  pending: Interrupt[],
  resolvedId: string | null,
): InterruptModel[] {
  const interrupt = pending[0];
  if (!interrupt || interrupt.id === resolvedId) {
    return [];
  }
  return [toInterruptModel(interrupt)];
}

function toInterruptModel(interrupt: Interrupt): InterruptModel {
  const metadata = interrupt.metadata as InterruptMetadata | undefined;
  const suspendPayload = metadata?.suspendPayload;

  const options = Array.isArray(suspendPayload?.options)
    ? (suspendPayload.options as InterruptOption[])
    : [];

  return {
    id: interrupt.id,
    message:
      typeof suspendPayload?.message === 'string'
        ? suspendPayload.message
        : (interrupt.message ?? 'Approval needed'),
    options: options.length > 0 ? options : DEFAULT_INTERRUPT_OPTIONS,
  };
}
