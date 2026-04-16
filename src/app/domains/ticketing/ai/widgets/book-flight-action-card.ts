import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  type AgUiActionCard,
  type AgUiActionData,
  defineActionCard,
} from '@internal/ag-ui-client';

import {
  BookingClient,
  type FlightMutationFlight,
  type FlightMutationResult,
} from '../../data/flight-mutation-client';
import {
  getActionStatusLabel,
  getFlightContextText,
  isFlightMutationResult,
  shouldShowUndo,
  toLoadFailedResult,
} from './card-utils';

interface BookFlightInput {
  flightId: number;
}

type BookFlightActionData = AgUiActionData<
  BookFlightInput,
  FlightMutationResult
>;

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
export class BookFlightActionCard implements AgUiActionCard<BookFlightActionData> {
  private readonly bookingClient = inject(BookingClient);

  readonly actionData = input.required<BookFlightActionData>();

  private readonly undoPending = signal(false);
  private readonly undoResult = signal<FlightMutationResult | undefined>(
    undefined,
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
      this.actionData().status,
      this.actionData().error,
      this.result(),
    ),
  );

  protected readonly showUndo = computed(() =>
    shouldShowUndo(
      this.undoPending(),
      this.undoResult(),
      this.actionData().status,
      this.result(),
    ),
  );

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

  private result(): FlightMutationResult | undefined {
    const result = this.actionData().result;
    return isFlightMutationResult(result) ? result : undefined;
  }

  private flightId(): number {
    const result = this.result();
    return result?.ok ? result.flight.id : this.actionData().input.flightId;
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

function getBookFlightTitle(flightId: number): string {
  return `Book Flight #${flightId}`;
}

export const bookFlightActionCard = defineActionCard({
  toolName: 'bookFlight',
  component: BookFlightActionCard,
});
