import { type InputContentPart, type Interrupt } from '@ag-ui/core';
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

/** One clickable answer option a suspended tool offers the user. */
interface InterruptOption {
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
  /** Open AG-UI interrupts (e.g. a suspended server tool awaiting a choice). */
  readonly pendingInterrupts = input<Interrupt[]>([]);
  readonly resumeInterrupt = output<Record<string, unknown>>();

  // Only one interrupt is ever open in practice (the ticketing tools process
  // one book/cancel step at a time) — render the first.
  protected readonly activeInterrupt = computed<InterruptModel | null>(() =>
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

/**
 * A suspended tool's `suspendPayload` (see e.g. ai-server's bookFlightTool)
 * lands in `interrupt.metadata.suspendPayload`, shaped as
 * `{ message: string, options: InterruptOption[] }` by convention — any
 * server tool that suspends can offer arbitrary choices this way, not just
 * ticketing's book/cancel flow.
 */
function toInterruptModel(
  interrupt: Interrupt | undefined,
): InterruptModel | null {
  if (!interrupt) {
    return null;
  }

  const suspendPayload = (
    interrupt.metadata as { suspendPayload?: unknown } | undefined
  )?.suspendPayload as { message?: unknown; options?: unknown } | undefined;

  return {
    id: interrupt.id,
    message:
      typeof suspendPayload?.message === 'string'
        ? suspendPayload.message
        : (interrupt.message ?? 'Approval needed'),
    options: Array.isArray(suspendPayload?.options)
      ? (suspendPayload.options as InterruptOption[])
      : [],
  };
}
