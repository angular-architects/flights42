import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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

// Shape aligned with Mastra's tool-result convention (`result: string`) so
// both our own tool returns and Mastra's built-in decline ("Tool call was not
// approved by the user") map onto the same type. Extra fields (`flight`,
// `code`) are additive domain data.
export type FlightMutationResult =
  | {
      ok: true;
      result: string;
      flight: FlightMutationFlight;
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
      this.http.post<FlightMutationResult>(this.bookingUrl(flightId), {}),
    );
  }

  cancelFlight(flightId: number): Promise<FlightMutationResult> {
    return firstValueFrom(
      this.http.delete<FlightMutationResult>(this.bookingUrl(flightId)),
    );
  }

  private bookingUrl(flightId: number): string {
    return new URL(
      `${BOOKINGS_PATH}/${flightId}`,
      this.config.agUiUrl,
    ).toString();
  }
}
