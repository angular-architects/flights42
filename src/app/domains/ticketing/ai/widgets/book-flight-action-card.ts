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
import { format } from 'date-fns';

import {
  FlightMutationClient,
  type FlightMutationFlight,
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

  protected readonly titleText = computed(
    () => `Book Flight #${this.flightId()}`,
  );

  protected readonly contextText = computed(() => {
    const details = this.flightDetails();
    return details
      ? `${details.from} -> ${details.to}, ${formatDate(details.date)}`
      : null;
  });

  protected readonly statusLabel = computed(() => {
    if (this.undoPending()) {
      return 'Undoing';
    }

    const undoResult = this.undoResult();
    if (undoResult) {
      return undoResult.ok ? 'Undone' : 'Failed';
    }

    const result = this.result();
    switch (this.data().status) {
      case 'interrupt':
        return 'Waiting for approval';
      case 'pending':
        return 'Started';
      case 'error':
        return this.data().error ?? 'Failed';
      case 'complete':
        if (result?.ok) {
          return 'Success';
        }

        if (result?.code === 'USER_CANCELLED') {
          return 'Not approved';
        }

        return result?.message ?? 'Failed';
    }
  });

  protected readonly showUndo = computed(() => {
    if (this.undoPending() || this.undoResult()) {
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

  private flightDetails(): FlightMutationFlight | undefined {
    const undoResult = this.undoResult();
    if (undoResult?.ok) {
      return undoResult.flight;
    }

    const result = this.result();
    return result?.ok ? result.flight : undefined;
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'dd.MM.yyyy HH:mm');
}
