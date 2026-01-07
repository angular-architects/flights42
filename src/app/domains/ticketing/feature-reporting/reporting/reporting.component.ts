import { JsonPipe } from '@angular/common';
import {
  Component,
  effect,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  createRuntime,
  createRuntimeFunction,
  createToolJavaScript,
  structuredCompletionResource,
} from '@hashbrownai/angular';
import { RuntimeRef, s } from '@hashbrownai/core';
import { DataItem, NgxChartsModule } from '@swimlane/ngx-charts';
import { firstValueFrom } from 'rxjs';

import { FlightSchema } from '../../data/flight-info';
import { FlightService } from '../../data/flight-service';

function createChartingRuntime(
  data: WritableSignal<DataItem[]>,
  requestCount: WritableSignal<number>,
) {
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
          requestCount.update((value) => value + 1);
          return Promise.resolve();
        },
      }),
    ],
  });
}

function createChartResource(
  runtime: RuntimeRef,
  input: Signal<string | undefined>,
) {
  return structuredCompletionResource({
    model: 'gpt-5-chat-latest',
    input,
    system: `
      You are Report42, an UI assistent that help passengers with creating and displaying
      a chart with flight information.

      - Voice: clear, helpful, and respectful.
      - Audience: power users who want to get a chart
      
      ## Your Tasks

      1. Take the users request for a chart and generate JavaScript code that ...
        a) uses the tool _loadFlights_ as often as needed to retrieve the needed data
        b) Aggregate the received data according to the user's request. Replace 0 by 0.1
        c) Pass the data to the tool _generateChart_ to display a chart
      2. Pass the JavaScript code to the runtime

      ## Example for the JavaScript Code

      - User: How many flights are there from Graz to London and from Graz to Munich?
      - Assistant
        - Code:

          const flights1 = loadFlights({ from: 'Graz', to: 'London'});
          const flights2 = loadFlights({ from: 'Graz', to: 'München'});
          
          const data = [
            { name: 'Graz - London', value: flights1.length },            
            { name: 'Graz - München', value: flights2.length },            
          ];

          generateChart({ data });
        
        - Answer: Here is your chart. 

      ## Rules
      - Never use additional web resources for answering requests
      - **Always** pass the generated code to the JavaScript runtime
    `,
    schema: s.object(`Whether request was successfull`, {
      type: s.enumeration(`Success or error?`, ['success', 'error']),
      message: s.string(`Addidional information for the user`),
      code: s.string(`the generated JavaScript code`),
    }),
    tools: [
      createToolJavaScript({
        runtime,
      }),
    ],
  });
}

@Component({
  selector: 'app-reporting',
  imports: [NgxChartsModule, FormsModule, JsonPipe],
  templateUrl: './reporting.component.html',
  styleUrl: './reporting.component.css',
})
export class ReportingComponent {
  data = signal<DataItem[]>([]);

  showDetails = signal(false);
  requestCount = signal(0);

  message = signal('');
  input = signal<string | undefined>(undefined);

  runtime = createChartingRuntime(this.data, this.requestCount);

  generator = createChartResource(this.runtime, this.input);

  constructor() {
    effect(() => {
      console.log('calls', this.requestCount());
      console.log('data', this.data());
    });
  }

  submit(): void {
    this.input.set(this.message());
  }

  format(value: number) {
    return Number.isInteger(value) ? value.toString() : '';
  }

  toggleDetails(): void {
    this.showDetails.update((value) => !value);
  }

  regenerate(): void {
    this.generator.reload();
  }
}
