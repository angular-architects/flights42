import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  type AgUiActionWidgetData,
  defineAgUiComponent,
} from '@internal/ag-ui-client';

import {
  FlightMutationClient,
  type FlightMutationResult,
} from '../../data/flight-mutation-client';

interface BookFlightInput {
  flightId: number;
}

@Component({
  selector: 'app-book-flight-action-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="card-header">
        <h2 class="title">{{ headline() }}</h2>
      </div>
      <div class="card-body">
        <p>{{ description() }}</p>

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

    .card-header {
      padding: 0.75rem 0.875rem 0;
    }

    .card-header h2.title {
      font-size: 1rem;
      line-height: 1.25;
    }

    .card-body {
      padding: 0.75rem 0.875rem 0.875rem;
      font-size: 0.95rem;
    }

    p {
      margin-top: 0;
      margin-bottom: 0;
    }

    p + p {
      margin-top: 0.625rem;
    }

    .btn {
      padding: 0.35rem 0.75rem;
      font-size: 0.875rem;
    }
  `,
})
export class BookFlightActionCard {
  private readonly mutationClient = inject(FlightMutationClient);

  readonly data =
    input.required<
      AgUiActionWidgetData<BookFlightInput, FlightMutationResult>
    >();

  private readonly undoPending = signal(false);
  private readonly undoResult = signal<FlightMutationResult | undefined>(
    undefined,
  );

  protected readonly headline = computed(() => {
    if (this.undoPending()) {
      return 'Undoing booking';
    }

    const undoResult = this.undoResult();
    if (undoResult) {
      return undoResult.ok ? 'Booking undone' : 'Undo failed';
    }

    switch (this.data().status) {
      case 'interrupt':
        return 'Booking started';
      case 'pending':
        return 'Booking started';
      case 'error':
        return 'Booking failed';
      case 'complete':
        return this.result()?.ok ? 'Booking finished' : 'Booking failed';
    }
  });

  protected readonly description = computed(() => {
    const flightId = this.flightId();

    if (this.undoPending()) {
      return `Cancelling booked flight #${flightId}...`;
    }

    const undoResult = this.undoResult();
    if (undoResult) {
      return undoResult.ok
        ? `Booking for flight #${undoResult.flight.id} has been undone.`
        : undoResult.message;
    }

    const result = this.result();
    switch (this.data().status) {
      case 'interrupt':
        return `Waiting for approval to book flight #${flightId}.`;
      case 'pending':
        return `Starting booking for flight #${flightId}...`;
      case 'error':
        return this.data().error ?? `Booking flight #${flightId} failed.`;
      case 'complete':
        if (result?.ok) {
          return `Booked flight #${result.flight.id} from ${result.flight.from} to ${result.flight.to}.`;
        }

        return result?.message ?? `Booking flight #${flightId} finished.`;
    }
  });

  protected readonly showUndo = computed(() => {
    if (this.undoPending() || this.undoResult()?.ok) {
      return false;
    }

    const result = this.result();
    return this.data().status === 'complete' && !!result?.ok;
  });

  protected async undo(): Promise<void> {
    this.undoPending.set(true);

    try {
      this.undoResult.set(
        await this.mutationClient.cancelFlight(this.flightId()),
      );
    } catch (error) {
      this.undoResult.set(toLoadFailedResult(error, this.flightId(), 'cancel'));
    } finally {
      this.undoPending.set(false);
    }
  }

  private result(): FlightMutationResult | undefined {
    const result = this.data().result;
    return isFlightMutationResult(result) ? result : undefined;
  }

  private flightId(): number {
    const result = this.result();
    return result?.ok ? result.flight.id : this.data().input.flightId;
  }
}

export const bookFlightActionCard = defineAgUiComponent({
  kind: 'action',
  name: 'bookFlightActionCard',
  description:
    'Shows booking progress and lets users undo a successful booking.',
  component: BookFlightActionCard,
  toolName: 'bookFlight',
  clientOnly: true,
});

function isFlightMutationResult(value: unknown): value is FlightMutationResult {
  if (!value || typeof value !== 'object' || !('ok' in value)) {
    return false;
  }

  return typeof (value as { ok?: unknown }).ok === 'boolean';
}

function toLoadFailedResult(
  error: unknown,
  flightId: number,
  action: 'book' | 'cancel',
): FlightMutationResult {
  return {
    ok: false,
    code: 'LOAD_FAILED',
    message:
      error instanceof Error
        ? error.message
        : `Could not ${action} flight ${flightId}.`,
  };
}
