import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { type HotelInfo } from '../data/hotel-info';

@Component({
  selector: 'app-hotel-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let hotelValue = hotel();
    <div class="card">
      <div class="media">
        <img [src]="hotelValue.imageUrl" [alt]="hotelValue.name" />
      </div>
      <div class="card-body">
        <h2 class="title">{{ hotelValue.name }}</h2>
        <p class="city">{{ hotelValue.city }}</p>
        <p class="stars" [attr.aria-label]="hotelValue.sterne + ' Sterne'">
          @for (star of starsArray(); track $index) {
            <span class="star filled">★</span>
          }
          @for (star of emptyStarsArray(); track $index) {
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
  readonly hotel = input.required<HotelInfo>();

  protected readonly starsArray = computed(() =>
    Array.from({ length: this.hotel().sterne }),
  );
  protected readonly emptyStarsArray = computed(() =>
    Array.from({ length: Math.max(0, 5 - this.hotel().sterne) }),
  );
}
