import { resource, Service, Signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Luggage } from './luggage';

@Service()
export class LuggageClient {
  find(): Observable<Luggage[]> {
    return of(this.getLuggage());
  }

  findLuggage() {
    return resource({
      loader: async () => {
        return this.getLuggage();
      },
      defaultValue: [],
    });
  }

  // No defaultValue: without nonBlocking() in the route the Router would wait
  // for this Resource, just like for a Resolver
  findLuggageById(id: Signal<number>) {
    return resource({
      params: id,
      loader: async ({ params: id }) => {
        // Slow on purpose: shows that a non-blocking resource lets the
        // router activate the route before the data has arrived
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.getLuggage().find((item) => item.id === id);
      },
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
        destination: 'Wien',
        status: 'In Transit',
      },
      {
        id: 2003,
        passengerName: 'Hans Müller',
        weight: 25.0,
        destination: 'Graz',
        status: 'Delivered',
      },
    ];
  }
}
