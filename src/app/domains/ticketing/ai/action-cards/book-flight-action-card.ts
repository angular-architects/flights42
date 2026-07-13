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
  type FlightMutationResult,
  type FlightPaymentMethod,
} from '../../data/flight-mutation-client';
import {
  getActionErrorMessage,
  getActionStatusLabel,
  getFlightContextText,
  getFlightDetails,
  getFlightMutationResult,
  shouldShowUndo,
  toLoadFailedResult,
} from './card-utils';

const PAYMENT_METHOD_LABELS: Record<FlightPaymentMethod, string> = {
  creditCard: 'Credit card',
  miles: 'Bonus miles',
};

const bookFlightArgsSchema = z.object({
  flightId: z.number(),
});

export type BookFlightArgs = z.infer<typeof bookFlightArgsSchema>;

function getBookFlightTitle(flightId: number | undefined): string {
  return flightId === undefined ? 'Book Flight' : `Book Flight #${flightId}`;
}

function getPaymentMethodLabel(
  undoResult: FlightMutationResult | undefined,
  result: FlightMutationResult | undefined,
): string | null {
  if (undoResult) {
    return null;
  }

  if (!result?.ok || !result.paymentMethod) {
    return null;
  }

  return PAYMENT_METHOD_LABELS[result.paymentMethod];
}

@Component({
  selector: 'app-book-flight-action-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-body">
        <p class="action-title">{{ titleText() }}</p>

        @if (contextText(); as context) {
          <p class="action-context">{{ context }}</p>
        }

        <p class="status-line">Status: {{ statusLabel() }}</p>

        @if (errorMessage(); as error) {
          <p class="error-line">{{ error }}</p>
        }

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
      </div>
    </div>
  `,
  styleUrl: './action-card.css',
})
export class BookFlightActionCard implements ToolRenderer<BookFlightArgs> {
  private readonly bookingClient = inject(BookingClient);

  readonly toolCall = input.required<AngularToolCall<BookFlightArgs>>();

  private readonly undoPending = signal(false);
  private readonly undoResult = signal<FlightMutationResult | undefined>(
    undefined,
  );

  private readonly complete = computed(
    () => this.toolCall().status === 'complete',
  );

  private readonly result = computed(() =>
    getFlightMutationResult(this.complete(), this.toolCall().result),
  );

  protected readonly flightId = computed<number | undefined>(
    () => this.toolCall().args.flightId,
  );

  private readonly flightDetails = computed(() =>
    getFlightDetails(this.undoResult(), this.result()),
  );

  protected readonly titleText = computed(() =>
    getBookFlightTitle(this.flightId()),
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

  protected readonly errorMessage = computed(() =>
    getActionErrorMessage(
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

  protected readonly paymentMethodLabel = computed(() =>
    getPaymentMethodLabel(this.undoResult(), this.result()),
  );

  protected async undo(): Promise<void> {
    const flightId = this.flightId();
    if (flightId === undefined) {
      return;
    }

    this.undoPending.set(true);

    try {
      this.undoResult.set(await this.bookingClient.cancelFlight(flightId));
    } catch (error) {
      this.undoResult.set(toLoadFailedResult(error, flightId, 'cancel'));
    } finally {
      this.undoPending.set(false);
    }
  }
}

export const bookFlightActionCard = createRenderToolCall({
  name: 'bookFlightTool',
  args: bookFlightArgsSchema,
  component: BookFlightActionCard,
});
