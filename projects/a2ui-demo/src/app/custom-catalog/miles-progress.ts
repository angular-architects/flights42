import type { BoundProperty } from '@a2ui/angular/v0_9';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

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
  readonly props = input<Record<string, BoundProperty<unknown>>>({});
  readonly surfaceId = input.required<string>();
  readonly componentId = input.required<string>();
  readonly dataContextPath = input('/');

  protected readonly resolvedLabel = computed(() => {
    const value = this.props()['label']?.value();
    return typeof value === 'string' && value.length > 0
      ? value
      : 'Miles Progress';
  });
  protected readonly resolvedMiles = computed(() => {
    const value = this.props()['miles']?.value();
    return typeof value === 'number' ? value : 0;
  });
  protected readonly nextThreshold = computed(() => {
    const currentMiles = this.resolvedMiles();
    let threshold = Math.ceil(currentMiles / 100000) * 100000;
    if (threshold === currentMiles) {
      threshold += 100000;
    }
    return threshold || 100000;
  });
  protected readonly remainingMiles = computed(
    () => this.nextThreshold() - this.resolvedMiles(),
  );
  protected readonly remainingMiles = computed(() =>
    calcRemainingMiles(this.nextThreshold(), this.passenger().bonusMiles),
  );
  protected readonly progressPercent = computed(() =>
    calcProgressPercent(this.nextThreshold(), this.passenger().bonusMiles),
  );
}
