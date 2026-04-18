import { type AgUiToolCallStatus } from '@internal/ag-ui-client';

import { formatUiDateTime } from '../../../shared/util-common/date-utils';
import {
  type FlightMutationFlight,
  type FlightMutationResult,
} from '../../data/flight-mutation-client';

interface Result {
  ok?: unknown;
}

export function isFlightMutationResult(
  value: unknown,
): value is FlightMutationResult {
  if (!value || typeof value !== 'object' || !('ok' in value)) {
    return false;
  }

  const result = value as Result;
  return typeof result.ok === 'boolean';
}

export function toLoadFailedResult(
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
