import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { PassengerCard } from '../passenger-card/passenger-card';
import { PassengerStore } from './passenger-store';

@Component({
  selector: 'app-passenger-search',
  imports: [FormsModule, PassengerCard, JsonPipe, RouterLink],
  templateUrl: './passenger-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerSearch {
  private readonly store = inject(PassengerStore);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly name = linkedSignal(() => this.store.name());
  protected readonly firstName = linkedSignal(() => this.store.firstName());

  protected readonly passengers = this.store.passengers;
  protected readonly isLoading = this.store.isLoading;
  protected readonly error = this.store.error;

  protected readonly selected = this.store.selected;

  protected readonly filter = computed(() => ({
    name: this.name(),
    firstName: this.firstName(),
  }));

  constructor() {
    this.showError();

    // TODO: Call updateFilter to connect the filter to the rxMethod
  }

  private showError() {
    effect(() => {
      const error = this.error();
      if (error) {
        const message = 'Error loading passengers: ' + error;
        this.snackBar.open(message, 'OK');
      }
    });
  }

  protected search(): void {
    // TODO: Call updateFilter to reload data with the _current_ parameters
  }

  protected updateSelected(passengerId: number, selected: boolean): void {
    this.store.updateSelected(passengerId, selected);
  }
}
