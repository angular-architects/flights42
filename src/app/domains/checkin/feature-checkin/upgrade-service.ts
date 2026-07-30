import { inject, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Service()
export class UpgradeService {
  private readonly snackBar = inject(MatSnackBar);

  upgrade(flightNumber: string): void {
    console.log('upgrade requested for flight', flightNumber);
    this.snackBar.open('You are upgraded now!', 'OK', { duration: 3000 });
  }
}
