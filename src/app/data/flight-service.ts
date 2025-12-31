import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable, resource, Signal } from '@angular/core';
import { Flight, initFlight } from './flight';
import { ConfigService } from '../shared/config-service';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, Observable } from 'rxjs';
import { FlightCriteria } from './flight-criteria';

@Injectable({
  providedIn: 'root',
})
export class FlightService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  find(from: string, to: string, urgent = false): Observable<Flight[]> {
    const url = `${this.configService.baseUrl}/flight`;

    const headers = {
      Accept: 'application/json',
    };

    const params = { from, to, urgent };

    return this.http.get<Flight[]>(url, { headers, params });
  }

  createResource(criteria: Signal<FlightCriteria>) {
    return httpResource<Flight[]>(
      () => ({
        url: `${this.configService.baseUrl}/flight`,
        headers: {
          Accept: 'application/json',
        },
        params: {
          from: criteria().from,
          to: criteria().to,
        },
      }),
      { defaultValue: [] },
    );
  }

  createRxResource(criteria: Signal<FlightCriteria>) {
    return rxResource({
      params: criteria,
      stream: (loaderParams) => {
        const c = loaderParams.params;
        return this.find(c.from, c.to);
      },
      defaultValue: [],
    });
  }

  createPromiseResource(criteria: Signal<FlightCriteria>) {
    return resource({
      params: criteria,
      loader: (loaderParams) => {
        const c = loaderParams.params;
        return firstValueFrom(this.find(c.from, c.to));
      },
      defaultValue: [],
    });
  }

  findById(id: string): Observable<Flight> {
    const url = `${this.configService.baseUrl}/flight`;

    const headers = {
      Accept: 'application/json',
    };

    const params = { id };

    return this.http.get<Flight>(url, { headers, params });
  }

  findFlightResourceById(id: Signal<number>) {
    return httpResource<Flight>(
      () => ({
        url: `${this.configService.baseUrl}/flight`,
        headers: {
          Accept: 'application/json',
        },
        params: {
          id: id(),
        },
      }),
      { defaultValue: initFlight },
    );
  }

  create(flight: Flight): Observable<Flight> {
    const url = `${this.configService.baseUrl}/flight`;

    const headers = {
      Accept: 'application/json',
    };

    return this.http.post<Flight>(url, flight, { headers });
  }

  update(flight: Flight): Observable<Flight> {
    const url = `${this.configService.baseUrl}/flight/${flight.id}`;

    const headers = {
      Accept: 'application/json',
    };

    return this.http.put<Flight>(url, flight, { headers });
  }
}
