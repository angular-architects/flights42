import { type AgUiToolCallStatus } from '@internal/ag-ui-client';

import { formatUiDateTime } from '../../../shared/util-common/date-utils';
import {
  type FlightMutationFlight,
  type FlightMutationResult,
} from '../../data/flight-mutation-client';

export function toFlightMutationResult(
  value: unknown,
): FlightMutationResult | undefined {
  // Mastra's built-in `requireApproval: true` decline streams a plain string
  // ("Tool call was not approved by the user") as the tool result. Normalize
  // it to our shape so the card can treat it like a user cancellation.
  if (typeof value === 'string') {
    return {
      ok: false,
      result: value,
      code: 'USER_CANCELLED',
    };
  }

  if (isStructuredResult(value)) {
    return value;
  }

  return undefined;
}

export function toLoadFailedResult(
  error: unknown,
  flightId: number,
  action: 'book' | 'cancel',
): FlightMutationResult {
  const message =
    error instanceof Error
      ? error.message
      : `Could not ${action} flight ${flightId}.`;

  return {
    ok: false,
    result: message,
    code: 'LOAD_FAILED',
  };
}

export function getFlightContextText(
  details: FlightMutationFlight | undefined,
): string | null {
  return details
    ? `${details.from} -> ${details.to}, ${formatUiDateTime(details.date)}`
    : null;
}

export function getActionStatusLabel(
  undoPending: boolean,
  undoResult: FlightMutationResult | undefined,
  status: AgUiToolCallStatus,
  error: string | undefined,
  result: FlightMutationResult | undefined,
): string {
  if (undoPending) {
    return 'Undoing';
  }

  if (undoResult) {
    return undoResult.ok ? 'Undone' : 'Failed';
  }

  switch (status) {
    case 'interrupt':
      return 'Waiting for approval';
    case 'pending':
      return 'Started';
    case 'error':
      return error ?? 'Failed';
    case 'complete':
      if (result?.ok) {
        return 'Success';
      }

      if (result?.code === 'USER_CANCELLED') {
        return 'Cancelled';
      }

      return 'Failed';
  }
}

export function shouldShowUndo(
  undoPending: boolean,
  undoResult: FlightMutationResult | undefined,
  status: AgUiToolCallStatus,
  result: FlightMutationResult | undefined,
): boolean {
  if (undoPending || undoResult) {
    return false;
  }

  return status === 'complete' && !!result?.ok;
}

function isStructuredResult(value: unknown): value is FlightMutationResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as { ok?: unknown; result?: unknown };
  return typeof record.ok === 'boolean' && typeof record.result === 'string';
}
