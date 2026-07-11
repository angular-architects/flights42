import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, of, throwError } from 'rxjs';

import { ConfigService } from '../../shared/util-common/config-service';

const BOOKINGS_PATH = '/bookings';

export interface FlightMutationFlight {
  id: number;
  from: string;
  to: string;
  date: string;
  delay: number;
}

export type FlightMutationFailureCode =
  | 'ALREADY_BOOKED'
  | 'NOT_BOOKED'
  | 'NOT_FOUND'
  | 'LOAD_FAILED'
  | 'USER_CANCELLED';

export type FlightPaymentMethod = 'creditCard' | 'miles';

// Shape aligned with Mastra's tool-result convention (`result: string`) so
// both our own tool returns and Mastra's built-in decline ("Tool call was not
// approved by the user") map onto the same type. Extra fields (`flight`,
// `code`, `paymentMethod`) are additive domain data.
export type FlightMutationResult =
  | {
      ok: true;
      result: string;
      flight: FlightMutationFlight;
      paymentMethod?: FlightPaymentMethod;
    }
  | {
      ok: false;
      result: string;
      code: FlightMutationFailureCode;
    };

@Injectable({ providedIn: 'root' })
export class BookingClient {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  bookFlight(flightId: number): Promise<FlightMutationResult> {
    return firstValueFrom(
      this.http
        .post<FlightMutationResult>(this.bookingUrl(flightId), {})
        .pipe(catchError(recoverStructuredError)),
    );
  }

  cancelFlight(flightId: number): Promise<FlightMutationResult> {
    return firstValueFrom(
      this.http
        .delete<FlightMutationResult>(this.bookingUrl(flightId))
        .pipe(catchError(recoverStructuredError)),
    );
  }

  private bookingUrl(flightId: number): string {
    return new URL(
      `${BOOKINGS_PATH}/${flightId}`,
      this.config.agUiUrl,
    ).toString();
  }
}

// The bookings route answers declined mutations (already booked, not booked,
// not found) with a structured FlightMutationResult body on a non-2xx status
// (409/404/400). HttpClient throws on those regardless of the body, which
// would otherwise discard the real reason in favor of a generic "could not
// book/cancel" message — recover it here so the caller still sees `ok: false`
// with the server's actual `result`/`code` instead of an exception.
function recoverStructuredError(error: unknown) {
  if (
    error instanceof HttpErrorResponse &&
    isFlightMutationResult(error.error)
  ) {
    return of(error.error);
  }
  return throwError(() => error);
}

function isFlightMutationResult(value: unknown): value is FlightMutationResult {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as { ok?: unknown; result?: unknown };
  return typeof record.ok === 'boolean' && typeof record.result === 'string';
}
