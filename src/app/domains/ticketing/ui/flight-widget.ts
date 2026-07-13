import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

import { createFrontendTool } from '../../shared/util-copilotkit/tool-definition';
import { FlightStore } from '../data/flight-store';
import { FlightCard } from './flight-card/flight-card';

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
  imports: [FlightCard, RouterLink],
  template: `
    @let flight = toolCall().args.flight;
    @if (flight) {
      @let status = toolCall().args.status ?? 'other';
      <app-flight-card
        [item]="flight"
        [selected]="isSelected(flight.id)"
        [readonly]="true">
        @if (status === 'booked') {
          <button
            class="btn btn-default"
            [routerLink]="['/checkin', { ticketId: flight.id }]">
            Check in
          </button>
        } @else if (status === 'other') {
          @if (isSelected(flight.id)) {
            <button class="btn btn-default" (click)="select(flight.id, false)">
              Remove
            </button>
          } @else {
            <button class="btn btn-default" (click)="select(flight.id, true)">
              Select
            </button>
          }
        }
      </app-flight-card>
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class FlightWidget implements ToolRenderer<FlightWidgetArgs> {
  private readonly store = inject(FlightStore);

  readonly toolCall = input.required<AngularToolCall<FlightWidgetArgs>>();

  protected isSelected(id: number): boolean {
    return this.store.basket()[id];
  }

  protected select(id: number, selected: boolean): void {
    this.store.updateBasket(id, selected);
  }
}

export const flightWidget = createFrontendTool({
  name: 'flightWidget',
  description: `
    Interactive card displaying one concrete flight.
    Call this whenever users should see flights: booked flight lists, specific booked-flight confirmations (e.g. "Did I book Paris?"), or current search/working-set flights.
    For booked flights use status: "booked"; for search/current flights use status: "other".
    Use status: "none" for purely informational proposals (e.g. flight suggestions in a chat) that must NOT show any action button.
  `,
  parameters: flightWidgetSchema,
  component: FlightWidget,
  followUp: false,
  handler: async () => ({ shown: true }),
});
