import { inject, Signal } from '@angular/core';
import {
  createToolJavaScript,
  structuredCompletionResource,
} from '@hashbrownai/angular';
import { RuntimeRef, s } from '@hashbrownai/core';

import { ConfigService } from '../../../shared/util-common/config-service';

export function createChartResource(
  runtime: RuntimeRef,
  input: Signal<string | undefined>,
) {
  const config = inject(ConfigService);

  return structuredCompletionResource({
    model: config.model,
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
