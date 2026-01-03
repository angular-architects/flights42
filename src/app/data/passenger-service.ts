import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable, Signal } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../shared/config-service';
import { initPassenger, Passenger } from './passenger';

@Injectable({
  providedIn: 'root',
})
export class PassengerService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  find(name: string, firstName: string): Observable<Passenger[]> {
    const url = `${this.configService.baseUrl}/passenger`;

    const headers = {
      Accept: 'application/json',
    };

    const params = { name, firstName };

    return this.http.get<Passenger[]>(url, { headers, params });
  }

  findResource(name: Signal<string>, firstName: Signal<string>) {
    const isActive = () => name() || firstName();

    return httpResource<Passenger[]>(
      () =>
        !isActive()
          ? undefined
          : {
              url: `${this.configService.baseUrl}/passenger`,
              headers: {
                Accept: 'application/json',
              },
              params: {
                name: name(),
                firstName: firstName(),
              },
            },
      { defaultValue: [] },
    );
  }

  findById(id: string): Observable<Passenger> {
    const url = `${this.configService.baseUrl}/passenger`;

    const headers = {
      Accept: 'application/json',
    };

    const params = { id };

    return this.http.get<Passenger>(url, { headers, params });
  }

  findPassengerResourceById(id: Signal<number>) {
    return httpResource<Passenger>(
      () => ({
        url: `${this.configService.baseUrl}/passenger`,
        headers: {
          Accept: 'application/json',
        },
        params: {
          id: id(),
        },
      }),
      { defaultValue: initPassenger },
    );
  }

  create(passenger: Passenger): Observable<Passenger> {
    const url = `${this.configService.baseUrl}/passenger`;

    const headers = {
      Accept: 'application/json',
    };

    return this.http.post<Passenger>(url, passenger, { headers });
  }

  update(passenger: Passenger): Observable<Passenger> {
    const url = `${this.configService.baseUrl}/passenger/${passenger.id}`;

    const headers = {
      Accept: 'application/json',
    };

    return this.http.put<Passenger>(url, passenger, { headers });
  }
}
