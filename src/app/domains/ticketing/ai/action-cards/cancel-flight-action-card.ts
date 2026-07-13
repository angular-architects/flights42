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

const cancelFlightArgsSchema = z.object({
  flightId: z.number(),
});

export type CancelFlightArgs = z.infer<typeof cancelFlightArgsSchema>;

function getCancelFlightTitle(flightId: number | undefined): string {
  return flightId === undefined
    ? 'Cancel Flight'
    : `Cancel Flight #${flightId}`;
}

@Component({
  selector: 'app-cancel-flight-action-card',
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
export class CancelFlightActionCard implements ToolRenderer<CancelFlightArgs> {
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
    getCancelFlightTitle(this.flightId()),
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

  protected async undo(): Promise<void> {
    const flightId = this.flightId();
    if (flightId === undefined) {
      return;
    }

    this.undoPending.set(true);

    try {
      this.undoResult.set(await this.bookingClient.bookFlight(flightId));
    } catch (error) {
      this.undoResult.set(toLoadFailedResult(error, flightId, 'book'));
    } finally {
      this.undoPending.set(false);
    }
  }
}

export const cancelFlightActionCard = createRenderToolCall({
  name: 'cancelFlightTool',
  args: cancelFlightArgsSchema,
  component: CancelFlightActionCard,
});
