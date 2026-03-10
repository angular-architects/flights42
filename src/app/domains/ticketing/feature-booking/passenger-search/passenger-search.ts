import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { PassengerCard } from '../passenger-card/passenger-card';
import { PassengerStore } from './passenger-store';

@Component({
  selector: 'app-passenger-search',
  imports: [FormField, PassengerCard, JsonPipe, RouterLink],
  templateUrl: './passenger-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerSearch {
  private readonly store = inject(PassengerStore);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly name = this.store.name;
  protected readonly firstName = this.store.firstName;

  protected readonly passengers = this.store.passengers;
  protected readonly isLoading = this.store.loading;
  protected readonly error = this.store.error;

  protected readonly selected = this.store.selected;

  protected readonly filter = linkedSignal(() => ({
    name: this.name(),
    firstName: this.firstName(),
  }));

  protected readonly filterForm = form(this.filter);

  constructor() {
    this.store.updateFilter(this.filter);
    this.showError();
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
