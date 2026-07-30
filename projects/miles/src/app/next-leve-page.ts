import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-next-level',
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h1>Next Level</h1>
    <p>Remaining Miles: 37000</p>
  `,
})
export class NextLevelPage {}
