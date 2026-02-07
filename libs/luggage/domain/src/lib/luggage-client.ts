import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { Luggage } from './luggage';

@Injectable({ providedIn: 'root' })
export class LuggageClient {
  load(): Observable<Luggage[]> {
    return of([
      { id: 1, description: 'gray suitcase' },
      { id: 2, description: 'black piano' },
      { id: 3, description: 'handy helicopter' },
    ]);
  }
}
