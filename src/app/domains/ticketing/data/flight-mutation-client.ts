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
