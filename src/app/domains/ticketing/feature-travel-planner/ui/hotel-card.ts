import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { type PlanHotel } from '../travel-plan-store';

@Component({
  selector: 'app-hotel-card',
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
export class HotelCard {
  readonly hotel = input.required<PlanHotel>();

  protected readonly starsArray = computed(() =>
    Array.from({ length: this.hotel().sterne }),
  );
  protected readonly emptyStarsArray = computed(() =>
    Array.from({ length: Math.max(0, 5 - this.hotel().sterne) }),
  );
}
