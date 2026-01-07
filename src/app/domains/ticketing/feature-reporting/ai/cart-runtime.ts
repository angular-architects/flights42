import { inject, WritableSignal } from '@angular/core';
import { createRuntime, createRuntimeFunction } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';
import { DataItem } from '@swimlane/ngx-charts';
import { firstValueFrom } from 'rxjs';

import { FlightSchema } from '../../data/flight-info';
import { FlightService } from '../../data/flight-service';

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
          const flightService = inject(FlightService);
          const result = flightService.find(input.from, input.to);
          return await firstValueFrom(result);
        },
      }),
      createRuntimeFunction({
        name: 'generateChart',
        description: `Generates a chart`,
        args: s.object(`Chart description`, {
          data: s.array(
            `name/value pairs to display in chart`,
            s.object(`a single name/value pair to display in the chart`, {
              name: s.string(`name`),
              value: s.number(`the value to display`),
            }),
          ),
        }),
        handler: (input) => {
          console.log('generateChart', input);
          data.set(input.data);
          return Promise.resolve();
        },
      }),
    ],
  });
}
