import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

import { createFrontendTool } from '../../shared/util-copilotkit/tool-definition';
import { FlightInfo } from '../data/flight-info';
import { FlightStore } from '../data/flight-store';

const flightSchema = z.object({
  id: z.number().describe('The flight id'),
  from: z.string().describe('Departure city'),
  to: z.string().describe('Arrival city'),
  date: z.string().describe('Departure date in ISO format'),
  delay: z.number().describe('Delay in minutes'),
});

const flightWidgetSchema = z.object({
  flight: flightSchema,
  status: z.enum(['booked', 'other', 'none']).describe('Status of the flight'),
});

type FlightWidgetArgs = z.infer<typeof flightWidgetSchema>;

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
        @if (status() !== 'none') {
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
        }
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
  readonly status = input<'booked' | 'other' | 'none'>('other');

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

@Component({
  selector: 'app-flight-widget-tool',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlightWidget],
  template: `
    @let flight = toolCall().args.flight;
    @if (flight) {
      <app-flight-widget
        [flight]="flight"
        [status]="toolCall().args.status ?? 'other'" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class FlightWidgetTool implements ToolRenderer<FlightWidgetArgs> {
  readonly toolCall = input.required<AngularToolCall<FlightWidgetArgs>>();
}

export const flightWidget = createFrontendTool({
  name: 'flightWidget',
  description: [
    'Interactive card displaying one concrete flight.',
    'Call this whenever users should see flights: booked flight lists, specific booked-flight confirmations (e.g. "Did I book Paris?"), or current search/working-set flights.',
    'For booked flights use status: "booked"; for search/current flights use status: "other".',
    'Use status: "none" for purely informational proposals (e.g. flight suggestions in a chat) that must NOT show any action button.',
  ].join('\n'),
  parameters: flightWidgetSchema,
  component: FlightWidgetTool,
  followUp: false,
  handler: async () => ({ shown: true }),
});
