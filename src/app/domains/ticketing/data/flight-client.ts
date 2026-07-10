import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable, Signal } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigService } from '../../shared/util-common/config-service';
import { Flight } from './flight';

@Injectable({ providedIn: 'root' })
export class FlightClient {
  private configService = inject(ConfigService);
  private http = inject(HttpClient);

  findById(id: string): Observable<Flight> {
    const url = `${this.configService.baseUrl}/flight`;

    const headers = {
      Accept: 'application/json',
    };

    const params = { id };

    return this.http.get<Flight>(url, { headers, params });
  }

  findResource(from: Signal<string>, to: Signal<string>) {
    return httpResource<Flight[]>(
      () => {
        if (!from() || !to()) {
          return undefined;
        }

        return {
          url: `${this.configService.baseUrl}/flight`,
          params: {
            from: from(),
            to: to(),
          },
        };
      },
      { defaultValue: [] },
    );
  }
}
