import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConfigService } from '../../shared/util-common/config-service';

const BOOKED_FLIGHTS_PATH = '/booked-flights';

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

export type FlightMutationResult =
  | {
      ok: true;
      flight: FlightMutationFlight;
    }
  | {
      ok: false;
      code: FlightMutationFailureCode;
      message: string;
    };

@Injectable({ providedIn: 'root' })
export class BookingClient {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  bookFlight(flightId: number): Promise<FlightMutationResult> {
    return firstValueFrom(
      this.http.post<FlightMutationResult>(this.bookFlightUrl(flightId), {}),
    );
  }

  cancelFlight(flightId: number): Promise<FlightMutationResult> {
    return firstValueFrom(
      this.http.post<FlightMutationResult>(this.cancelFlightUrl(flightId), {}),
    );
  }

  private bookFlightUrl(flightId: number): string {
    return new URL(
      `${BOOKED_FLIGHTS_PATH}/${flightId}/book`,
      this.config.agUiUrl,
    ).toString();
  }

  private cancelFlightUrl(flightId: number): string {
    return new URL(
      `${BOOKED_FLIGHTS_PATH}/${flightId}/cancel`,
      this.config.agUiUrl,
    ).toString();
  }
}
