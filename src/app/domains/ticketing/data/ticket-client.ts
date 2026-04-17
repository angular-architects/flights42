import { HttpClient } from '@angular/common/http';
import { inject, Injectable, resource } from '@angular/core';
import { firstValueFrom, map, Observable } from 'rxjs';

import { ConfigService } from '../../shared/util-common/config-service';
import { initialAircraft } from './aircraft';
import { Flight } from './flight';

interface BookedFlightDto {
  id: number;
  from: string;
  to: string;
  date: string;
  delay: number;
}

interface BookingsResponse {
  flights: BookedFlightDto[];
}

export interface BookingResult {
  ok: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TicketClient {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  private get bookingsUrl() {
    return `${this.configService.aiServerUrl}/bookings`;
  }

  findTickets() {
    return resource({
      loader: async () => firstValueFrom(this.find()),
      defaultValue: [] as Flight[],
    });
  }

  find(): Observable<Flight[]> {
    return this.http
      .get<BookingsResponse>(this.bookingsUrl)
      .pipe(map((response) => response.flights.map(toFlight)));
  }

  book(flightId: number): Observable<BookingResult> {
    return this.http.post<BookingResult>(
      `${this.bookingsUrl}/${flightId}`,
      null,
    );
  }

  cancel(flightId: number): Observable<BookingResult> {
    return this.http.delete<BookingResult>(`${this.bookingsUrl}/${flightId}`);
  }
}

function toFlight(raw: BookedFlightDto): Flight {
  return {
    id: raw.id,
    from: raw.from,
    to: raw.to,
    date: raw.date,
    delay: raw.delay,
    delayed: raw.delay > 0,
    aircraft: initialAircraft,
    prices: [],
  };
}
