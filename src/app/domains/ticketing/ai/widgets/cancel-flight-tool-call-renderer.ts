import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  type HumanInTheLoopToolCall,
  type HumanInTheLoopToolRenderer,
} from '@copilotkit/angular';
import { z } from 'zod';

import { createHumanInTheLoop } from '../../../shared/util-copilotkit/tool-definition';
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

        @if (awaitingChoice()) {
          <p class="prompt">Cancel flight #{{ flightId() }}?</p>
          <div class="approval-actions approval-actions--inline">
            <button
              class="btn btn-default"
              type="button"
              (click)="decide(false)">
              Keep booking
            </button>
            <button class="btn btn-danger" type="button" (click)="decide(true)">
              Cancel flight
            </button>
          </div>
        } @else {
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

    /* Binary choice: buttons sit side by side. */
    .approval-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .approval-actions--inline {
      flex-direction: row;
    }

    .approval-actions--inline .btn {
      flex: 1;
    }
  `,
})
export class CancelFlightToolCallRenderer implements HumanInTheLoopToolRenderer<CancelFlightArgs> {
  private readonly bookingClient = inject(BookingClient);

  readonly toolCall =
    input.required<HumanInTheLoopToolCall<CancelFlightArgs>>();

  private readonly decided = signal(false);
  private readonly outcome = signal<FlightMutationResult | undefined>(
    undefined,
  );

  private readonly undoPending = signal(false);
  private readonly undoResult = signal<FlightMutationResult | undefined>(
    undefined,
  );

  private readonly complete = computed(
    () => this.toolCall().status === 'complete',
  );

  protected readonly awaitingChoice = computed(
    () => !this.decided() && !this.complete(),
  );

  // Prefer the outcome executed here; fall back to the tool-call result if this
  // component was recreated after completion and lost its local state.
  private readonly result = computed<FlightMutationResult | undefined>(() => {
    const local = this.outcome();
    if (local) {
      return local;
    }

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
      this.complete() || this.outcome() !== undefined,
      this.result(),
    ),
  );

  protected readonly showUndo = computed(() =>
    shouldShowUndo(
      this.undoPending(),
      this.undoResult(),
      this.complete() || this.outcome() !== undefined,
      this.result(),
    ),
  );

  protected async decide(approved: boolean): Promise<void> {
    if (this.decided()) {
      return;
    }
    this.decided.set(true);

    const respond = this.toolCall().respond;

    if (!approved) {
      const result: FlightMutationResult = {
        ok: false,
        result: `Cancellation of flight ${this.flightId()} was declined by the user.`,
        code: 'USER_CANCELLED',
      };
      this.outcome.set(result);
      respond(result);
      return;
    }

    let result: FlightMutationResult;
    try {
      result = await this.bookingClient.cancelFlight(this.flightId());
    } catch (error) {
      result = toLoadFailedResult(error, this.flightId(), 'cancel');
    }

    this.outcome.set(result);
    respond(result);
  }

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

export const cancelFlightHitlTool = createHumanInTheLoop({
  name: 'cancelFlightTool',
  description:
    'Cancels a previously booked flight for the current passenger. The passenger confirms or declines the cancellation directly in the rendered card. Only pass the flightId; do not ask for confirmation in text.',
  parameters: cancelFlightArgsSchema,
  component: CancelFlightToolCallRenderer,
});
