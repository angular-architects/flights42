import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';

const hotelSchema = z.object({
  id: z.string().describe('Stable hotel id (e.g. "grand-palace").'),
  name: z.string().describe('Full hotel name including the city.'),
  sterne: z.number().int().min(1).max(5).describe('Star rating from 1 to 5.'),
  imageUrl: z
    .string()
    .describe('Absolute or app-relative URL to a hotel image.'),
  city: z.string().describe('City the hotel is located in.'),
});

type Hotel = z.infer<typeof hotelSchema>;

const hotelWidgetSchema = z.object({
  hotel: hotelSchema,
});

type HotelWidgetArgs = z.infer<typeof hotelWidgetSchema>;

@Component({
  selector: 'app-hotel-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let h = hotel();
    <div class="card">
      <div class="media">
        <img [src]="h.imageUrl" [alt]="h.name" />
      </div>
      <div class="card-body">
        <h2 class="title">{{ h.name }}</h2>
        <p class="city">{{ h.city }}</p>
        <p class="stars" [attr.aria-label]="h.sterne + ' Sterne'">
          @for (s of starsArray(); track $index) {
            <span class="star filled">★</span>
          }
          @for (s of emptyStarsArray(); track $index) {
            <span class="star empty">★</span>
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
      overflow: hidden;
      border-radius: var(--radius, 12px);
      background: var(--color-surface, #fff);
    }

    .media {
      width: 100%;
      aspect-ratio: 5 / 3;
      background: #e5e7eb;
      overflow: hidden;
    }

    .media img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    .card-body {
      padding: 16px 20px 20px;
    }

    .title {
      font-size: var(--font-size);
      font-weight: var(--font-weight-bold);
      margin: 0 0 4px;
    }

    .city {
      color: var(--color-label);
      font-size: var(--font-size-tiny);
      margin: 0 0 8px;
    }

    .stars {
      margin: 0;
      font-size: 1.1em;
      letter-spacing: 2px;
      line-height: 1;
    }

    .star.filled {
      color: #f5b301;
    }

    .star.empty {
      color: #d1d5db;
    }
  `,
})
export class HotelWidget {
  readonly hotel = input.required<Hotel>();

  protected readonly starsArray = computed(() =>
    Array.from({ length: this.hotel().sterne }),
  );
  protected readonly emptyStarsArray = computed(() =>
    Array.from({ length: Math.max(0, 5 - this.hotel().sterne) }),
  );
}

@Component({
  selector: 'app-hotel-widget-tool',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HotelWidget],
  template: `
    @let hotel = toolCall().args.hotel;
    @if (hotel) {
      <app-hotel-widget [hotel]="hotel" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class HotelWidgetTool implements ToolRenderer<HotelWidgetArgs> {
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
  component: HotelWidgetTool,
  followUp: false,
  handler: async () => ({ shown: true }),
});
