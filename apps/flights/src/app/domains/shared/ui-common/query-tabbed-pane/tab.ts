import { Component, computed, input } from '@angular/core';

import { TabbedPane } from './tabbed-pane';

@Component({
  selector: 'app-tab',
  standalone: true,
  imports: [],
  template: `
    @if (visible()) {
      <div class="tab-content">
        <ng-content></ng-content>
      </div>
    }
  `,
  styles: `
    .tab-content {
      animation: fadeIn 0.2s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `,
})
export class Tab {
  // private pane = inject(TabbedPane, { optional: true });
  private _pane?: TabbedPane;
  readonly title = input.required<string>();

  protected readonly visible = computed(
    () => this._pane?.currentTab() === this,
  );

  set pane(pane: TabbedPane) {
    this._pane = pane;
  }
}
