import { Component, computed, inject } from '@angular/core';
import { MilesService } from '@flights42/miles-data';

@Component({
  selector: 'lib-miles-feature-next-level',
  imports: [],
  templateUrl: './miles-feature-next-level.html',
  styleUrl: './miles-feature-next-level.css',
})
export class MilesFeatureNextLevel {
  private milesService = inject(MilesService);
  protected readonly milesResource = this.milesService.load();

  // Simple calc for demo
  protected readonly delta = computed(
    () =>
      10000 -
      this.milesResource
        .value()
        .map((miles) => miles.amount)
        .reduce((acc, current) => acc + current, 0),
  );
}
