import type { Interrupt } from '@ag-ui/client';
import { JsonPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

interface InterruptOption {
  id: string;
  label: string;
  payload: Record<string, unknown>;
  variant?: 'primary' | 'default' | 'danger';
}

interface InterruptPayload {
  toolName?: string;
  args?: unknown;
  suspendPayload?: {
    message?: unknown;
    options?: unknown;
  };
}

interface InterruptModel {
  id: string;
  reason: string;
  message: string;
  args: unknown;
  options: InterruptOption[];
}

@Component({
  selector: 'app-copilot-interrupts',
  imports: [JsonPipe],
  template: `
    @for (activeInterrupt of interruptModels(); track activeInterrupt.id) {
      <article class="msg assistant">
        <div class="avatar">🤖</div>
        <div>
          <div class="bubble">
            <strong>Approval needed</strong>
            <div [title]="activeInterrupt.args | json">
              {{ activeInterrupt.message }}
            </div>
            <div class="approval-actions">
              @if (activeInterrupt.options.length > 0) {
                @for (option of activeInterrupt.options; track option.id) {
                  <button
                    type="button"
                    [class]="buttonClass(option)"
                    (click)="resumeInterrupt.emit(option.payload)">
                    {{ option.label }}
                  </button>
                }
              } @else {
                <button
                  class="btn btn-default"
                  type="button"
                  (click)="resumeInterrupt.emit(rejectPayload)">
                  Reject
                </button>
                <button
                  class="btn btn-primary"
                  type="button"
                  (click)="resumeInterrupt.emit(approvePayload)">
                  Approve
                </button>
              }
            </div>
          </div>
          <div class="meta"></div>
        </div>
      </article>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .approval-actions {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      margin-top: 10px;
    }

    .approval-actions .btn {
      margin-right: 0;
      width: 100%;
    }

    .approval-actions .btn-primary {
      background-color: #3f51b5;
    }

    .approval-actions .btn-primary:hover {
      background-color: #32408f;
    }
  `,
})
export class CopilotInterrupts {
  readonly interrupts = input<Interrupt[]>([]);
  readonly resumeInterrupt = output<Record<string, unknown>>();

  protected readonly approvePayload = { approved: true };
  protected readonly rejectPayload = { approved: false };

  protected readonly interruptModels = computed(() =>
    this.interrupts().map((interrupt) => toInterruptModel(interrupt)),
  );

  protected buttonClass(option: InterruptOption): string {
    if (option.variant === 'danger') {
      return 'btn btn-danger';
    }

    if (option.variant === 'primary') {
      return 'btn btn-primary';
    }

    return 'btn btn-default';
  }
}

function toInterruptModel(interrupt: Interrupt): InterruptModel {
  const payload = readPayload(interrupt);
  const suspendPayload = payload?.suspendPayload;
  const message =
    typeof suspendPayload?.message === 'string'
      ? suspendPayload.message
      : interrupt.message ||
        (payload?.toolName
          ? `Tool Call: ${payload.toolName}`
          : interrupt.reason);

  return {
    id: interrupt.id,
    reason: interrupt.reason,
    message,
    args: payload?.args,
    options: toOptions(suspendPayload?.options),
  };
}

function readPayload(interrupt: Interrupt): InterruptPayload | undefined {
  const metadataPayload = readInterruptPayload(interrupt.metadata);
  if (metadataPayload) {
    return metadataPayload;
  }

  return readInterruptPayload(
    (interrupt as Interrupt & { payload?: unknown }).payload,
  );
}

function readInterruptPayload(value: unknown): InterruptPayload | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const suspendPayload = record['suspendPayload'];

  return {
    toolName:
      typeof record['toolName'] === 'string' ? record['toolName'] : undefined,
    args: record['args'],
    suspendPayload:
      suspendPayload && typeof suspendPayload === 'object'
        ? (suspendPayload as InterruptPayload['suspendPayload'])
        : undefined,
  };
}

function toOptions(value: unknown): InterruptOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isInterruptOption);
}

function isInterruptOption(value: unknown): value is InterruptOption {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const option = value as Partial<InterruptOption>;
  return (
    typeof option.id === 'string' &&
    typeof option.label === 'string' &&
    Boolean(option.payload) &&
    typeof option.payload === 'object' &&
    !Array.isArray(option.payload)
  );
}
