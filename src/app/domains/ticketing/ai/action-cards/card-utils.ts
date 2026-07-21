import { formatUiDateTime } from '../../../shared/util-common/date-utils';
import {
  type FlightMutationFlight,
  type FlightMutationResult,
} from '../../data/flight-mutation-client';

/**
 * Turns the tool's raw result into a typed `FlightMutationResult`. On the wire
 * that result is just a string, so nothing here may be taken on trust.
 */
export function getFlightMutationResult(
  complete: boolean,
  rawResult: string | undefined,
): FlightMutationResult | undefined {
  if (!complete || rawResult === undefined) {
    return undefined;
  }

  const parsed = safeParse(rawResult);

  // Not even valid JSON: surface the raw text as a failure instead of
  // rendering blank. This is not a declined action — that one arrives as a
  // structured result carrying `USER_CANCELLED` from the tool itself.
  if (typeof parsed === 'string') {
    return { ok: false, result: parsed, code: 'INVALID_RESULT' };
  }

  // Valid JSON, but any shape at all — accept it only once the fields the
  // card relies on are actually there.
  const candidate = parsed as { ok?: unknown; result?: unknown } | null;
  if (
    typeof candidate?.ok !== 'boolean' ||
    typeof candidate.result !== 'string'
  ) {
    return undefined;
  }

  return candidate as FlightMutationResult;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function getFlightDetails(
  undoResult: FlightMutationResult | undefined,
  result: FlightMutationResult | undefined,
): FlightMutationFlight | undefined {
  if (undoResult?.ok) {
    return undoResult.flight;
  }

  if (result?.ok) {
    return result.flight;
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
  complete: boolean,
  result: FlightMutationResult | undefined,
): string {
  if (undoPending) {
    return 'Undoing';
  }

  if (undoResult) {
    return undoResult.ok ? 'Undone' : 'Failed';
  }

  if (!complete) {
    return 'Started';
  }

  if (result?.ok) {
    return 'Success';
  }

  if (result?.code === 'USER_CANCELLED') {
    return 'Cancelled';
  }

  return 'Failed';
}

export function getActionErrorMessage(
  undoPending: boolean,
  undoResult: FlightMutationResult | undefined,
  complete: boolean,
  result: FlightMutationResult | undefined,
): string | null {
  if (undoPending) {
    return null;
  }

  if (undoResult) {
    return undoResult.ok ? null : undoResult.result;
  }

  if (!complete || !result || result.ok) {
    return null;
  }

  // A user-declined action is already conveyed by the "Cancelled" status;
  // surface only genuine failures (not found, already booked, load failed, …).
  if (result.code === 'USER_CANCELLED') {
    return null;
  }

  return result.result;
}

export function shouldShowUndo(
  undoPending: boolean,
  undoResult: FlightMutationResult | undefined,
  complete: boolean,
  result: FlightMutationResult | undefined,
): boolean {
  if (undoPending || undoResult) {
    return false;
  }

  return complete && !!result?.ok;
}
