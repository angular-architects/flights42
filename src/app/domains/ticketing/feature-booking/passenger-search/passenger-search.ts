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
    this.store.updateFilter(this.filter);
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
    this.store.updateFilter(this.filter());
    // this.store.reload();
  }

  protected updateSelected(passengerId: number, selected: boolean): void {
    this.store.updateSelected(passengerId, selected);
  }
}
