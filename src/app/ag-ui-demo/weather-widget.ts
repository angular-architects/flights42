import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { z } from 'zod';

import { defineAgUiComponent } from '../domains/shared/ui-agent/ag-ui-types';

@Component({
  selector: 'app-weather-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="weather-widget">
      <h3>Flugwetter Frankfurt</h3>
      <p>☀️ {{ condition() }}</p>
      <p>🌡️ {{ temperature() }}</p>
      <p>💨 {{ wind() }}</p>
    </div>
  `,
  styles: [
    `
      .weather-widget {
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 1rem;
        background: #f0f8ff;
        margin-top: 0.5rem;
      }
    `,
  ],
})
export class WeatherWidgetComponent {
  condition = input.required<string>();
  temperature = input.required<string>();
  wind = input.required<string>();
}

export const weatherWidget = defineAgUiComponent({
  name: 'weather',
  component: WeatherWidgetComponent,
  schema: z.object({
    condition: z.string(),
    temperature: z.string(),
    wind: z.string(),
  }),
});
