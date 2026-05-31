import { DatePipe, JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LanguageService } from '../../../shared/util-common/language';
import { Flight } from '../../data/flight';
import { FlightStore } from './flight-store';

@Component({
  selector: 'app-flight-search',
  imports: [FormsModule, DatePipe, JsonPipe],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  private flightStore = inject(FlightStore);
  private languageService = inject(LanguageService);

  protected readonly from = linkedSignal(() => this.flightStore.from());
  protected readonly to = linkedSignal(() => this.flightStore.to());

  protected readonly flightRoute = computed(
    () => this.from() + ' to ' + this.to(),
  );

  protected readonly flights = this.flightStore.flights;
  protected readonly flightsWithDelays = this.flightStore.flightsWithDelays;
  protected readonly error = this.flightStore.flightsError;
  protected readonly isLoading = this.flightStore.flightsIsLoading;

  protected readonly selectedFlight = signal<Flight | null>(null);

  constructor() {
    console.log('user language', this.languageService.getUserLang());

    effect(() => {
      const error = this.error();
      if (error) {
        console.error('Error loading flights', error);
      }
    });
  }

  protected search(): void {
    this.flightStore.updateFilter(this.from(), this.to());
  }

  protected select(flight: Flight): void {
    this.selectedFlight.set(flight);
  }

  protected delay(): void {
    this.flightStore.delay();
  }
}
