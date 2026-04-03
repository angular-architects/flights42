import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';
import { AgUiRegisteredComponent } from '@internal/ag-ui-client';
import { z } from 'zod';

import { FlightInfo } from '../../data/flight-info';
import { FlightStore } from '../../feature-booking/flight-search/flight-store';

@Component({
  selector: 'app-flight-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private store = inject(FlightStore);

  readonly flight = input.required<FlightInfo>();
  readonly status = input<'booked' | 'other'>('other');

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

const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

export const flightWidgetComponent: AgUiRegisteredComponent = {
  name: 'flightWidget',
  description: [
    'Interactive card displaying one concrete flight.',
    'Use after showComponents whenever users should see flights: booked flight lists, specific booked-flight confirmations (e.g. "Did I book Paris?"), or current search/working-set flights.',
    'For booked flights use status: "booked"; for search/current flights use status: "other".',
  ].join('\n'),
  component: FlightWidget,
  schema: z.object({
    flight: flightSchema,
    status: z.enum(['booked', 'other']),
  }),
};
