import type { AngularComponentImplementation } from '@a2ui/angular/v0_9';
import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { z } from 'zod/v3';

import {
  calcNextThreshold,
  calcProgressPercent,
  calcRemainingMiles,
} from './miles-calc';
import {
  initialContext,
  MilesProgressContext,
  passengerSchema,
} from './miles-progress-context';
import { binding } from './utils';

@Component({
  selector: 'app-miles-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <section class="miles-progress">
      <p class="eyebrow">Miles Progress</p>
      <p class="current">{{ passenger().bonusMiles | number }}</p>
      <p class="remaining">
        {{ remainingMiles() | number }} miles to {{ nextThreshold() | number }}
      </p>

      <div aria-hidden="true" class="track">
        <div class="fill" [style.width.%]="progressPercent()"></div>
      </div>
    </section>
  `,
  styleUrl: './miles-progress.css',
})
export class MilesProgress {
  readonly props = input<MilesProgressContext>(initialContext);
  readonly surfaceId = input.required<string>();
  readonly componentId = input.required<string>();
  readonly dataContextPath = input('/');

  protected readonly passenger = computed(() => this.props().passenger.value());
  protected readonly nextThreshold = computed(() =>
    calcNextThreshold(this.passenger().bonusMiles),
  );
  protected readonly remainingMiles = computed(() =>
    calcRemainingMiles(this.nextThreshold(), this.passenger().bonusMiles),
  );
  protected readonly progressPercent = computed(() =>
    calcProgressPercent(this.nextThreshold(), this.passenger().bonusMiles),
  );
}

const milesProgressSchema = z
  .object({
    passenger: binding(passengerSchema).optional(),
  })
  .strict();

export const milesProgressEntry = {
  name: 'MilesProgress',
  component: MilesProgress,
  schema: milesProgressSchema as unknown,
} as unknown as AngularComponentImplementation;
