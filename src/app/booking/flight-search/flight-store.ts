import { inject, Injectable, signal } from '@angular/core';
import { FlightService } from '../../data/flight-service';
import { FlightCriteria, initFlightCriteria } from '../../data/flight-criteria';

@Injectable({ providedIn: 'root' })
export class FlightStore {
  private flightService = inject(FlightService);

  private readonly _flightCriteria = signal(initFlightCriteria);
  readonly flightCriteria = this._flightCriteria.asReadonly();

  private readonly flightResource = this.flightService.createResource(this.flightCriteria);

  readonly flights = this.flightResource.value;
  readonly isLoading = this.flightResource.isLoading;
  readonly error = this.flightResource.error;

  updateCriteria(criteria: FlightCriteria): void {
    this._flightCriteria.set(criteria);
  }
}
