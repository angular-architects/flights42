import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { HotelCard } from './hotel-card';

const hotelSchema = z.object({
  id: z.string().describe('Stable hotel id (e.g. "grand-palace").'),
  name: z.string().describe('Full hotel name including the city.'),
  sterne: z.number().int().min(1).max(5).describe('Star rating from 1 to 5.'),
  imageUrl: z
    .string()
    .describe('Absolute or app-relative URL to a hotel image.'),
  city: z.string().describe('City the hotel is located in.'),
});

const hotelWidgetSchema = z.object({
  hotel: hotelSchema,
});

type HotelWidgetArgs = z.infer<typeof hotelWidgetSchema>;

@Component({
  selector: 'app-hotel-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HotelCard],
  template: `
    @let hotel = toolCall().args.hotel;
    @if (hotel) {
      <app-hotel-card [hotel]="hotel" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class HotelWidget implements ToolRenderer<HotelWidgetArgs> {
  readonly toolCall = input.required<AngularToolCall<HotelWidgetArgs>>();
}

export const hotelWidget = createFrontendTool({
  name: 'hotelWidget',
  description: [
    'Display card for a single hotel proposal (name, stars, image, city).',
    'Use this whenever the package planner proposes a hotel.',
    'This widget is read-only: no buttons, no selection, purely informative.',
  ].join('\n'),
  parameters: hotelWidgetSchema,
  component: HotelWidget,
  followUp: false,
  handler: async () => ({ shown: true }),
});
