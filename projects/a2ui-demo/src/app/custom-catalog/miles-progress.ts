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
  template: `
    <section class="miles-progress">
      <p class="eyebrow">{{ resolvedLabel() }}</p>
      <p class="current">{{ formattedMiles() }}</p>
      <p class="remaining">
        {{ formattedRemaining() }} miles to {{ formattedThreshold() }}
      </p>

      <div aria-hidden="true" class="track">
        <div class="fill" [style.width.%]="progressPercent()"></div>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .miles-progress {
      box-sizing: border-box;
      width: 100%;
      padding: 1rem;
      border-radius: 0.9rem;
      border: 1px solid #dbe3ff;
      background: linear-gradient(180deg, #f7f9ff 0%, #ffffff 100%);
      box-shadow: 0 8px 20px -16px rgba(15, 23, 42, 0.35);
    }

    .eyebrow,
    .current,
    .remaining {
      margin: 0;
    }

    .eyebrow {
      font-size: 0.9rem;
      font-weight: 700;
      color: #51607f;
    }

    .current {
      margin-top: 0.35rem;
      font-size: 1.45rem;
      font-weight: 800;
      color: #1c2640;
    }

    .remaining {
      margin-top: 0.25rem;
      font-size: 0.95rem;
      color: #52617f;
    }

    .track {
      margin-top: 0.8rem;
      height: 0.7rem;
      overflow: hidden;
      border-radius: 9999px;
      background: #e4ebff;
    }

    .fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #5665e8 0%, #6f7cff 100%);
      transition: width 180ms ease-out;
    }
  `,
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
  protected readonly progressPercent = computed(() => {
    const segmentStart = this.nextThreshold() - 100000;
    return Math.max(
      0,
      Math.min(100, ((this.resolvedMiles() - segmentStart) / 100000) * 100),
    );
  });
  protected readonly formattedMiles = computed(() =>
    this.formatNumber(this.resolvedMiles()),
  );
  protected readonly formattedRemaining = computed(() =>
    this.formatNumber(this.remainingMiles()),
  );
  protected readonly formattedThreshold = computed(() =>
    this.formatNumber(this.nextThreshold()),
  );

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }
}
