import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  linkedSignal,
  untracked,
} from '@angular/core';
import { PassengerStore } from './passenger-store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { PassengerCard } from '../passenger-card/passenger-card';
import { JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-passenger-search',
  imports: [FormsModule, PassengerCard, JsonPipe, RouterLink],
  templateUrl: './passenger-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassengerSearch {
  private store = inject(PassengerStore);
  private snackBar = inject(MatSnackBar);

  protected readonly name = linkedSignal(() => this.store.name());
  protected readonly firstName = linkedSignal(() => this.store.firstName());

  protected readonly passengers = this.store.passengers;
  protected readonly isLoading = this.store.isLoading;
  protected readonly error = this.store.error;
  protected readonly loaded = this.store.loaded;

  protected readonly selected = this.store.selected;

  constructor() {
    this.showError();
    this.connectFilter();
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

  private connectFilter() {
    effect(() => {
      const name = this.name();
      const firstName = this.firstName();
      untracked(() => {
        this.store.updateFilter(name, firstName);
      });
    });
  }

  search(): void {
    // this.store.updateFilter(this.name(), this.firstName());
    this.store.reload();
  }

  updateSelected(passengerId: number, selected: boolean): void {
    this.store.updateSelected(passengerId, selected);
  }
}
