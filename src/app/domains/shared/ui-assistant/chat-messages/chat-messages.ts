import { type InputContentPart, type Interrupt } from '@ag-ui/core';
import { Component, computed, input, output, signal } from '@angular/core';
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

  // Set the instant an option is clicked so the card hides immediately,
  // instead of waiting for the resume round-trip to clear it from
  // `pendingInterrupts()` (and to stop a second click firing meanwhile).
  private readonly resolvedInterruptId = signal<string | null>(null);

  // Only one interrupt is ever open in practice (the ticketing tools process
  // one book/cancel step at a time) — render the first, unless it was just
  // answered locally.
  protected readonly activeInterrupt = computed<InterruptModel | null>(() => {
    const interrupt = this.pendingInterrupts()[0];
    if (!interrupt || interrupt.id === this.resolvedInterruptId()) {
      return null;
    }
    return toInterruptModel(interrupt);
  });

  protected resolveInterrupt(
    interruptId: string,
    payload: Record<string, unknown>,
  ): void {
    this.resolvedInterruptId.set(interruptId);
    this.resumeInterrupt.emit(payload);
  }

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
