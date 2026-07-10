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
  type FlightPaymentMethod,
} from '../../data/flight-mutation-client';
import {
  getActionStatusLabel,
  getFlightContextText,
  parseToolResult,
  shouldShowUndo,
  toFlightMutationResult,
  toLoadFailedResult,
} from './card-utils';

const PAYMENT_METHOD_LABELS: Record<FlightPaymentMethod, string> = {
  creditCard: 'Credit card',
  miles: 'Bonus miles',
};

// The user either picks a payment method or cancels the booking altogether.
type BookSelection = FlightPaymentMethod | 'cancel';

const bookFlightArgsSchema = z.object({
  flightId: z.number(),
});

export type BookFlightArgs = z.infer<typeof bookFlightArgsSchema>;

@Component({
  selector: 'app-book-flight-tool-call-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-body">
        <p class="action-title">{{ titleText() }}</p>

        @if (awaitingChoice()) {
          <p class="prompt">
            How would you like to pay for flight #{{ flightId() }}?
          </p>
          <div class="approval-actions">
            <button
              class="btn btn-default"
              type="button"
              (click)="choose('creditCard')">
              Pay with credit card
            </button>
            <button
              class="btn btn-default"
              type="button"
              (click)="choose('miles')">
              Pay with bonus miles
            </button>
            <button
              class="btn btn-default"
              type="button"
              (click)="choose('cancel')">
              Cancel
            </button>
          </div>
        } @else {
          @if (contextText(); as context) {
            <p class="action-context">{{ context }}</p>
          }

          <p class="status-line">Status: {{ statusLabel() }}</p>

          @if (paymentMethodLabel(); as paymentLabel) {
            <p class="payment-line">Payment: {{ paymentLabel }}</p>
          }

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

    .payment-line {
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

    /* Options are stacked vertically. */
    .approval-actions {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .approval-actions .btn {
      width: 100%;
    }
  `,
})
export class BookFlightToolCallRenderer implements HumanInTheLoopToolRenderer<BookFlightArgs> {
  private readonly bookingClient = inject(BookingClient);

  readonly toolCall = input.required<HumanInTheLoopToolCall<BookFlightArgs>>();

  // Set as soon as the user picks; drives the transition from the choice UI to
  // the result UI even before the tool call flips to `complete`.
  private readonly selection = signal<BookSelection | undefined>(undefined);
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
    () => this.selection() === undefined && !this.complete(),
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
    () => `Book Flight #${this.flightId()}`,
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

  protected readonly paymentMethodLabel = computed(() => {
    if (this.undoResult()) {
      return null;
    }

    const result = this.result();
    if (!result?.ok || !result.paymentMethod) {
      return null;
    }

    return PAYMENT_METHOD_LABELS[result.paymentMethod];
  });

  protected async choose(selection: BookSelection): Promise<void> {
    if (this.selection() !== undefined) {
      return;
    }
    this.selection.set(selection);

    const respond = this.toolCall().respond;

    if (selection === 'cancel') {
      const result: FlightMutationResult = {
        ok: false,
        result: `Booking of flight ${this.flightId()} was cancelled by the user.`,
        code: 'USER_CANCELLED',
      };
      this.outcome.set(result);
      respond(result);
      return;
    }

    let result: FlightMutationResult;
    try {
      const booked = await this.bookingClient.bookFlight(this.flightId());
      result = booked.ok ? { ...booked, paymentMethod: selection } : booked;
    } catch (error) {
      result = toLoadFailedResult(error, this.flightId(), 'book');
    }

    this.outcome.set(result);
    respond(result);
  }

  protected async undo(): Promise<void> {
    this.undoPending.set(true);

    try {
      this.undoResult.set(
        await this.bookingClient.cancelFlight(this.flightId()),
      );
    } catch (error) {
      this.undoResult.set(toLoadFailedResult(error, this.flightId(), 'cancel'));
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

export const bookFlightHitlTool = createHumanInTheLoop({
  name: 'bookFlightTool',
  description:
    'Books a flight for the current passenger. The passenger chooses a payment method (credit card or bonus miles) directly in the rendered card, or cancels. Only pass the flightId; do not ask for the payment method in text.',
  parameters: bookFlightArgsSchema,
  component: BookFlightToolCallRenderer,
});
