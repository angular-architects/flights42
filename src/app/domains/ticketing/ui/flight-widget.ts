import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

import { createRenderToolCall } from '../../shared/util-copilotkit/tool-definition';
import { FlightCard } from './flight-card/flight-card';

const flightSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  delay: z.number(),
});

const bookedFlightsSchema = z.object({
  flights: z.array(flightSchema),
});

const findBookedFlightsArgsSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  flightId: z.number().optional(),
});

type FindBookedFlightsArgs = z.infer<typeof findBookedFlightsArgsSchema>;

@Component({
  selector: 'app-flight-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlightCard, RouterLink],
  template: `
    @for (flight of flights(); track flight.id) {
      <app-flight-card [item]="flight" [readonly]="true">
        <button
          class="btn btn-default"
          [routerLink]="['/checkin', { ticketId: flight.id }]">
          Check in
        </button>
      </app-flight-card>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  `,
})
export class FlightWidget implements ToolRenderer<FindBookedFlightsArgs> {
  readonly toolCall = input.required<AngularToolCall<FindBookedFlightsArgs>>();

  protected readonly flights = computed(() =>
    parseFlights(this.toolCall().result),
  );
}

function parseFlights(result: string | undefined) {
  if (!result) {
    return [];
  }
  try {
    return (
      bookedFlightsSchema.safeParse(JSON.parse(result)).data?.flights ?? []
    );
  } catch {
    return [];
  }
}

export const flightWidget = createRenderToolCall({
  name: 'findBookedFlightsTool',
  args: findBookedFlightsArgsSchema,
  component: FlightWidget,
});
