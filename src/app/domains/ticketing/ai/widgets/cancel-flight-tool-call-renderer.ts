import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

import { createRenderToolCall } from '../../../shared/util-copilotkit/tool-definition';
import {
  BookingClient,
  type FlightMutationFlight,
  type FlightMutationResult,
} from '../../data/flight-mutation-client';
import {
  getActionStatusLabel,
  getFlightContextText,
  parseToolResult,
  shouldShowUndo,
  toFlightMutationResult,
  toLoadFailedResult,
} from './card-utils';

const cancelFlightArgsSchema = z.object({
  flightId: z.number(),
});

export type CancelFlightArgs = z.infer<typeof cancelFlightArgsSchema>;

@Component({
  selector: 'app-cancel-flight-tool-call-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-body">
        <p class="action-title">{{ titleText() }}</p>

        @if (contextText(); as context) {
          <p class="action-context">{{ context }}</p>
        }

        <p class="status-line">Status: {{ statusLabel() }}</p>

        @if (showUndo()) {
          <p>
            <button class="btn btn-default" type="button" (click)="undo()">
              Undo
            </button>
          </p>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .card {
      margin: 0;
      background-color: #f6f8fc;
      border: 1px solid #dde5f2;
      box-shadow: none;
    }

    .card-body {
      padding: 0.625rem 0.75rem 0.75rem;
      font-size: 0.875rem;
    }

    .action-title {
      font-weight: 600;
    }

    .action-context {
      color: #4e5b78;
    }

    p {
      margin-top: 0;
      margin-bottom: 0;
    }

    p + p {
      margin-top: 0.5rem;
    }

    .btn {
      padding: 0.25rem 0.625rem;
      font-size: 0.8125rem;
    }

    .status-line {
      line-height: 1.4;
    }
  `,
})
export class CancelFlightToolCallRenderer implements ToolRenderer<CancelFlightArgs> {
  private readonly bookingClient = inject(BookingClient);

  readonly toolCall = input.required<AngularToolCall<CancelFlightArgs>>();

  private readonly undoPending = signal(false);
  private readonly undoResult = signal<FlightMutationResult | undefined>(
    undefined,
  );

  private readonly complete = computed(
    () => this.toolCall().status === 'complete',
  );

  // The cancellation itself now runs server-side (cancelFlightTool suspends
  // for the Accept/Decline choice and completes the mutation on resume) —
  // this card is a pure result view. Its "tool" message content is the
  // tool's own return value directly, no client-side wrapping involved.
  private readonly result = computed<FlightMutationResult | undefined>(() => {
    const call = this.toolCall();
    return call.status === 'complete'
      ? toFlightMutationResult(parseToolResult(call.result))
      : undefined;
  });

  protected readonly titleText = computed(
    () => `Cancel Flight #${this.flightId()}`,
  );

  protected readonly contextText = computed(() =>
    getFlightContextText(this.flightDetails()),
  );

  protected readonly statusLabel = computed(() =>
    getActionStatusLabel(
      this.undoPending(),
      this.undoResult(),
      this.complete(),
      this.result(),
    ),
  );

  protected readonly showUndo = computed(() =>
    shouldShowUndo(
      this.undoPending(),
      this.undoResult(),
      this.complete(),
      this.result(),
    ),
  );

  protected async undo(): Promise<void> {
    this.undoPending.set(true);

    try {
      this.undoResult.set(await this.bookingClient.bookFlight(this.flightId()));
    } catch (error) {
      this.undoResult.set(toLoadFailedResult(error, this.flightId(), 'book'));
    } finally {
      this.undoPending.set(false);
    }
  }

  protected flightId(): number {
    const argId = this.toolCall().args.flightId;
    const fallback = typeof argId === 'number' ? argId : 0;
    const result = this.result();
    return result?.ok ? (result.flight?.id ?? fallback) : fallback;
  }

  private flightDetails(): FlightMutationFlight | undefined {
    const undoResult = this.undoResult();
    if (undoResult?.ok) {
      return undoResult.flight;
    }

    const result = this.result();
    return result?.ok ? result.flight : undefined;
  }
}

export const cancelFlightRenderTool = createRenderToolCall({
  name: 'cancelFlightTool',
  args: cancelFlightArgsSchema,
  component: CancelFlightToolCallRenderer,
});
