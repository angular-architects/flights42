import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { debounce, form, FormField } from '@angular/forms/signals';

import { appSettings } from '../../../shared/util-common/app-settings';
import { delegatedSignal } from '../../../shared/util-common/delegated-signal';
import { LanguageService } from '../../../shared/util-common/language';
import { FlightCard } from '../../ui/flight-card/flight-card';
import { FlightStore } from './flight-store';

@Component({
  selector: 'app-flight-search',
  imports: [FormField, JsonPipe, FlightCard],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlightSearch {
  private flightStore = inject(FlightStore);
  private languageService = inject(LanguageService);

  protected readonly filter = delegatedSignal(
    () => ({
      from: this.flightStore.from(),
      to: this.flightStore.to(),
    }),
    (value) => this.flightStore.updateFilter(value.from, value.to),
  );
  protected readonly filterForm = form(this.filter, (path) => {
    debounce(path, appSettings.debounceTimeMs);
  });

  protected readonly flightRoute = computed(
    () => this.filter().from + ' to ' + this.filter().to,
  );

  protected readonly flights = this.flightStore.flights;
  protected readonly flightsWithDelays = this.flightStore.flightsWithDelays;
  protected readonly error = this.flightStore.flightsError;
  protected readonly isLoading = this.flightStore.flightsIsLoading;

  protected readonly basket = signal<Record<number, boolean>>({
    3: true,
    5: true,
  });

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
    this.flightStore.reload();
  }

  protected updateBasket(flightId: number, selected: boolean): void {
    this.basket.update((basket) => ({
      ...basket,
      [flightId]: selected,
    }));
  }

  protected delay(): void {
    this.flightStore.delay();
  }
}
