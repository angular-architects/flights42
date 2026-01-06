import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Luggage } from './luggage';

@Injectable({
  providedIn: 'root',
})
export class LuggageService {
  find(): Observable<Luggage[]> {
    return of(this.getLuggage());
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
