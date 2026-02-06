import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { exposeComponent } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';

import { FlightInfo, FlightSchema } from '../../data/flight-info';
import { SimpleFlightStore } from '../../feature-booking/flight-search/simple-flight-store';

@Component({
  selector: 'app-flight-widget',
  imports: [DatePipe],
  template: `
    @let itemValue = flight();
    <div [class.selected]="isSelected()" class="card">
      <div class="card-header">
        <h2 class="title">{{ itemValue.from }} - {{ itemValue.to }}</h2>
      </div>

      <div class="card-body">
        <p>Flight-No.: #{{ itemValue.id }}</p>
        <p>Date: {{ itemValue.date | date: 'dd.MM.yyyy HH:mm' }}</p>
        <p>Dealy: {{ itemValue.delay }} min</p>
        <p>
          @if (isBooked()) {
            <button class="btn btn-default" (click)="checkIn()">
              Check in
            </button>
          } @else if (isSelected()) {
            <button class="btn btn-default" (click)="select(false)">
              Remove
            </button>
          } @else {
            <button class="btn btn-default" (click)="select(true)">
              Select
            </button>
          }
        </p>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .card {
      margin: 0;
    }

    .card-header {
      padding: 20px 24px 0;
    }

    .title {
      font-size: var(--font-size);
      font-weight: var(--font-weight-bold);
      margin: 0;
    }

    .card-body > p:nth-child(1) {
      color: var(--color-label);
      font-size: var(--font-size-tiny);
      margin-bottom: 12px;
    }

    .card-body > p:nth-child(2) {
      font-size: var(--font-size-sm);
      margin-bottom: 4px;
    }

    .card-body > p:nth-child(3) {
      color: var(--color-label);
      font-size: var(--font-size-tiny);
      margin-bottom: 16px;
    }

    .card-body > p:has(button) {
      display: flex;
      gap: var(--spacing-x2);
      margin-bottom: 0;
    }
  `,
})
export class FlightWidget {
  private router = inject(Router);
  private store = inject(SimpleFlightStore);

  protected readonly flight = input.required<FlightInfo>();
  protected readonly status = input<'booked' | 'other'>('other');

  protected readonly isBooked = computed(() => this.status() === 'booked');
  protected readonly isSelected = computed(
    () => this.store.basket()[this.flight().id],
  );

  protected checkIn(): void {
    this.router.navigate(['/checkin', { ticketId: this.flight().id }]);
  }

  protected select(selected: boolean): void {
    this.store.updateBasket(this.flight().id, selected);
  }
}

export const flightWidget = exposeComponent(FlightWidget, {
  name: 'flightWidget',
  description: 'Displays information about a flight',
  input: {
    flight: FlightSchema,
    status: s.enumeration('Status of the flight', ['booked', 'other']),
  },
});
