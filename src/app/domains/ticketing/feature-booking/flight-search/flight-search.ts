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
import { form, FormField } from '@angular/forms/signals';

import { CityPipe } from '../../../shared/ui-common/city.pipe';
import { LanguageService } from '../../../shared/util-common/language';
import { Flight } from '../../data/flight';
import { FlightStore } from './flight-store';

@Component({
  selector: 'app-flight-search',
  imports: [FormField, DatePipe, JsonPipe, CityPipe],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  private flightStore = inject(FlightStore);
  private languageService = inject(LanguageService);

  protected readonly filter = linkedSignal(() => ({
    from: this.flightStore.from(),
    to: this.flightStore.to(),
  }));
  protected readonly filterForm = form(this.filter);

  protected readonly flightRoute = computed(
    () => this.filter().from + ' to ' + this.filter().to,
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
    this.flightStore.updateFilter(this.filter().from, this.filter().to);
  }

  protected select(flight: Flight): void {
    this.selectedFlight.set(flight);
  }

  protected delay(): void {
    this.flightStore.delay();
  }
}
