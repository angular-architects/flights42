import { inject, Injectable, resource } from '@angular/core';
import { Luggage } from './luggage';
import { ConfigService } from '../shared/config-service';

@Injectable({
  providedIn: 'root',
})
export class LuggageService {
  private configService = inject(ConfigService);

  findLuggage() {
    return resource({
      loader: async () => {
        return this.getLuggage();
      },
      defaultValue: [],
    });
  }

  private getLuggage(): Luggage[] {
    return [
      {
        id: 2001,
        passengerName: 'John Smith',
        weight: 23.5,
        destination: 'Hamburg',
        status: 'Checked In',
      },
      {
        id: 2002,
        passengerName: 'Maria Garcia',
        weight: 18.2,
        destination: 'Vienna',
        status: 'In Transit',
      },
      {
        id: 2003,
        passengerName: 'Hans Müller',
        weight: 25.0,
        destination: 'Frankfurt',
        status: 'Delivered',
      },
    ];
  }
}
