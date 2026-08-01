import { httpResource } from '@angular/common/http';
import { inject, Service, Signal } from '@angular/core';

import { ConfigService } from '../../shared/util-common/config-service';
import { Flight } from './flight';

@Service()
export class FlightClient {
  private configService = inject(ConfigService);

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
