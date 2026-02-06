import { inject, WritableSignal } from '@angular/core';
import { createRuntime, createRuntimeFunction } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';
import { firstValueFrom } from 'rxjs';

import { FlightClient } from '../../data/flight-client';
import { FlightSchema } from '../../data/flight-info';
import { DataItem } from '../chart/data-item';

export function createChartingRuntime(data: WritableSignal<DataItem[]>) {
  return createRuntime({
    functions: [
      createRuntimeFunction({
        name: 'loadFlights',
        description: `
        Searches for flights and returns them.
  
        ## Rules
        - For the search parameters, airport codes are NOT used but the city name. First letter in upper case.
        `,
        args: s.object('search parameters for flights', {
          from: s.string('airport of departure'),
          to: s.string('airport of destination'),
        }),
        result: s.array(`loaded flights`, FlightSchema),
        handler: async (input) => {
          const flightClient = inject(FlightClient);
          const result = flightClient.find(input.from, input.to);
          return await firstValueFrom(result);
        },
      }),
      createRuntimeFunction({
        name: 'generateChart',
        description: `Generates a chart`,
        // TODO: Add args describing the key/value pairs for
        //  the data signal
        handler: async (input) => {
          // TODO: Put the received key/value pairs into the
          //  passed data array
        },
      }),
    ],
  });
}
