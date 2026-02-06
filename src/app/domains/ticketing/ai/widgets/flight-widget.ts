import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { FlightInfo } from '../../data/flight-info';
import { FlightStore } from '../../feature-booking/flight-search/flight-store';

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
    .card {
      margin: 20px 0;
    }
  `,
})
export class FlightWidget {
  private router = inject(Router);
  private store = inject(FlightStore);

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

// TODO: Create and export a flightWidget
//  Hints
//    - export const flightWidget = exposeComponent(...);
//    - describe the flight input with the flightSchema from flight-info.ts
