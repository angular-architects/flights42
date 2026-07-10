import { type InputContentPart } from '@ag-ui/core';
import { type Interrupt } from '@ag-ui/core';
import { Component, computed, input, output } from '@angular/core';
import { type Message } from '@copilotkit/angular';

import { CopilotActivity } from '../copilot/activity/copilot-activity';
import { MessageComponent } from '../message';
import { ToolCallView } from './tool-call-view';

const ATTACHMENT_LABELS: Record<string, string> = {
  image: '[Bild hochgeladen]',
  audio: '[Audio hochgeladen]',
  video: '[Video hochgeladen]',
  document: '[Dokument hochgeladen]',
  binary: '[Datei hochgeladen]',
};

export interface InterruptOption {
  id: string;
  label: string;
  payload: Record<string, unknown>;
  variant?: 'primary' | 'default' | 'danger';
}

interface InterruptModel {
  id: string;
  message: string;
  options: InterruptOption[];
}

@Component({
  selector: 'app-chat-messages',
  imports: [ToolCallView, CopilotActivity, MessageComponent],
  templateUrl: './chat-messages.html',
  styleUrls: ['./chat-messages.css'],
})
export class ChatMessages {
  readonly messages = input.required<Message[]>();
  readonly agentId = input.required<string>();
  readonly pending = input<boolean>(false);
  readonly greeting = input<string>('Hi! How can I help you?');
  readonly pendingInterrupts = input<Interrupt[]>([]);
  readonly resumeInterrupt = output<unknown>();

  protected readonly approvePayload = { approved: true };
  protected readonly rejectPayload = { approved: false };

  protected readonly interruptModel = computed<InterruptModel | null>(() =>
    toInterruptModel(this.pendingInterrupts()[0]),
  );

  protected userText(content: string | InputContentPart[]): string {
    if (typeof content === 'string') {
      return content;
    }

    return content
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join(' ')
      .trim();
  }

  protected userAttachments(
    content: string | InputContentPart[],
  ): { label: string }[] {
    if (typeof content === 'string') {
      return [];
    }

    return content
      .filter((part) => part.type !== 'text')
      .map((part) => ({ label: ATTACHMENT_LABELS[part.type] ?? '[Anhang]' }));
  }
}

function toInterruptModel(
  interrupt: Interrupt | undefined,
): InterruptModel | null {
  if (!interrupt) {
    return null;
  }

  const options = interrupt.metadata?.['options'];

  return {
    id: interrupt.id,
    message: interrupt.message ?? interrupt.reason,
    options: Array.isArray(options) ? (options as InterruptOption[]) : [],
  };
}
