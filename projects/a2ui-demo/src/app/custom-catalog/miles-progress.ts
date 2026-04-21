import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import {
  calcNextThreshold,
  calcProgressPercent,
  calcRemainingMiles,
} from './miles-calc';
import { initialContext, MilesProgressContext } from './miles-progress-context';

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
