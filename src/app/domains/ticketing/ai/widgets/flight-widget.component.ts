import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { FlightStore } from '../../feature-booking/flight-search/flight-store';
import { FlightInfo } from './flight-info';

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
export class FlightWidgetComponent {
  router = inject(Router);
  store = inject(FlightStore);

  flight = input.required<FlightInfo>();
  status = input<'booked' | 'other'>('other');

  isBooked = computed(() => this.status() === 'booked');
  isSelected = computed(() => this.store.basket()[this.flight().id]);

  checkIn(): void {
    this.router.navigate(['/checkin', { ticketId: this.flight().id }]);
  }

  select(selected: boolean): void {
    this.store.updateBasket(this.flight().id, selected);
  }
}
