import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  linkedSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  DefaultLanguageService,
  LanguageService,
} from '../../../shared/util-common/language';
import { FlightCard } from '../../ui/flight-card/flight-card';
import { FlightStore } from '../flight-search/flight-store';

@Component({
  selector: 'app-flight-search',
  imports: [FormsModule, FlightCard, JsonPipe],
  templateUrl: './flight-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LanguageService, useClass: DefaultLanguageService }],
})
export class FlightSearch {
  private flightStore = inject(FlightStore);
  private languageService = inject(LanguageService);

  protected readonly from = linkedSignal(() => this.flightStore.from());
  protected readonly to = linkedSignal(() => this.flightStore.to());

  protected readonly flightsWithDelays = this.flightStore.flightsWithDelays;
  protected readonly error = this.flightStore.flightsError;
  protected readonly isLoading = this.flightStore.flightsIsLoading;

  protected readonly basket = this.flightStore.basket;

  constructor() {
    console.log('languageService', this.languageService.getUserLang());
  }

  protected search(): void {
    this.flightStore.updateFilter(this.from(), this.to());
  }

  protected updateBasket(flightId: number, selected: boolean): void {
    this.flightStore.updateBasket(flightId, selected);
  }

  protected delay(): void {
    this.flightStore.delay();
  }
}
