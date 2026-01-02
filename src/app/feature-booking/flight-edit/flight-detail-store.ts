import { inject, Injectable, signal } from '@angular/core';
import { FlightService } from '../../data/flight-service';
import { Flight } from '../../data/flight';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, finalize, tap, throwError, firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FlightDetailStore {
  private flightService = inject(FlightService);
  private snackBar = inject(MatSnackBar);

  // FlightId Filter
  private readonly _flightId = signal<number>(0);
  readonly flightId = this._flightId.asReadonly();

  // Pending state
  private readonly _isPending = signal(false);
  readonly isPending = this._isPending.asReadonly();

  // FlightResource
  private readonly flightResource = this.flightService.findResourceById(
    this.flightId,
  );
  readonly flight = this.flightResource.value;
  readonly isLoading = this.flightResource.isLoading;
  readonly error = this.flightResource.error;

  setFlightId(id: number): void {
    this._flightId.set(id);
  }

  saveFlight(flight: Flight): Promise<Flight> {
    this._isPending.set(true);

    return firstValueFrom(
      this.flightService.update(flight).pipe(
        tap((updatedFlight) => {
          this.flightResource.set(updatedFlight);
          this.snackBar.open('Flight updated successfully', 'OK', {
            duration: 3000,
          });
        }),
        catchError((err) => {
          const message = 'Failed to update flight';
          console.error(message, err);
          this.snackBar.open(message, 'OK', {
            duration: 5000,
          });
          return throwError(() => err);
        }),
        finalize(() => {
          this._isPending.set(false);
        }),
      ),
    );
  }

  reload(): void {
    this.flightResource.reload();
  }
}
