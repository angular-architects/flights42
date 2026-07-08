import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import {
  type AgUiActionCard,
  type AgUiActionData,
  type AgUiToolCallStatus,
  defineActionCard,
} from '@internal/ag-ui-client';
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
  shouldShowUndo,
  toFlightMutationResult,
  toLoadFailedResult,
} from './card-utils';

interface CancelFlightInput {
  flightId: number;
}

const cancelFlightArgsSchema = z.object({
  flightId: z.number(),
});

export type CancelFlightArgs = z.infer<typeof cancelFlightArgsSchema>;

type CancelFlightActionData = AgUiActionData<
  CancelFlightInput,
  FlightMutationResult
>;

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
export class CancelFlightActionCard implements AgUiActionCard<CancelFlightActionData> {
  private readonly bookingClient = inject(BookingClient);

  readonly actionData = input.required<CancelFlightActionData>();

  private readonly undoPending = signal(false);
  private readonly undoResult = signal<FlightMutationResult | undefined>(
    undefined,
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
      this.undoResult.set(await this.bookingClient.bookFlight(this.flightId()));
    } catch (error) {
      this.undoResult.set(toLoadFailedResult(error, this.flightId(), 'book'));
    } finally {
      this.undoPending.set(false);
    }
  }

  private result(): FlightMutationResult | undefined {
    return toFlightMutationResult(this.actionData().result);
  }

  private flightId(): number {
    const result = this.result();
    return result?.ok
      ? (result.flight?.id ?? this.actionData().input.flightId)
      : this.actionData().input.flightId;
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

function getCancelFlightTitle(flightId: number | null): string {
  return flightId === null ? 'Cancel Flight' : `Cancel Flight #${flightId}`;
}

export const cancelFlightActionCard = defineActionCard({
  toolName: 'cancelFlightTool',
  component: CancelFlightActionCard,
});

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
      this.status(),
      undefined,
      this.result(),
    ),
  );

  protected readonly showUndo = computed(() =>
    shouldShowUndo(
      this.undoPending(),
      this.undoResult(),
      this.status(),
      this.result(),
    ),
  );

  protected async undo(): Promise<void> {
    const flightId = this.flightId();

    if (flightId === null) {
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

  private status(): AgUiToolCallStatus {
    const toolCall = this.toolCall();

    if (toolCall.status !== 'complete') {
      return 'pending';
    }

    return this.result() ? 'complete' : 'error';
  }

  private result(): FlightMutationResult | undefined {
    const toolCall = this.toolCall();

    if (toolCall.status !== 'complete') {
      return undefined;
    }

    return toFlightMutationResult(parseToolResult(toolCall.result));
  }

  private flightId(): number | null {
    const result = this.result();
    const args = this.toolCall().args;

    if (result?.ok) {
      return result.flight?.id ?? args.flightId;
    }

    return typeof args.flightId === 'number' ? args.flightId : null;
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

function parseToolResult(result: string): unknown {
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
}
