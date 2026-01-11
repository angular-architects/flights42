import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-placeholder',
  imports: [],
  template: `
    <div class="upselling">
      <div class="ghost">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Placeholder {}
