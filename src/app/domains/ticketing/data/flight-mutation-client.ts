import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConfigService } from '../../shared/util-common/config-service';

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
export class FlightMutationClient {
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
      `/booked-flights/${flightId}/book`,
      this.config.agUiUrl,
    ).toString();
  }

  private cancelFlightUrl(flightId: number): string {
    return new URL(
      `/booked-flights/${flightId}/cancel`,
      this.config.agUiUrl,
    ).toString();
  }
}
