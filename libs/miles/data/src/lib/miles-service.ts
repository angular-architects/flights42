import { Injectable, resource } from '@angular/core';

import { MileCredit } from './miles';

const demoMiles: MileCredit[] = [
  { id: 1, flightRoute: 'Graz - London', amount: 300 },
  { id: 2, flightRoute: 'Graz - New York', amount: 3000 },
  { id: 3, flightRoute: 'New York - London', amount: 2500 },
];

@Injectable({ providedIn: 'root' })
export class MilesService {
  load() {
    return resource({
      loader: async () => {
        return demoMiles;
      },
      defaultValue: [],
    });
  }
}
