import { Component, computed, inject, input } from '@angular/core';

import { TabbedPaneComponent } from './tabbed-pane';

@Component({
  selector: 'app-tab',
  standalone: true,
  imports: [],
  template: `
    @if (visible()) {
      <div class="tab">
        <h2>{{ title() }}</h2>
        <ng-content></ng-content>
      </div>
    }
  `,
})
export class TabComponent {
  private pane = inject(TabbedPaneComponent);
  readonly title = input.required<string>();

  protected readonly visible = computed(() => this.pane.currentTab() === this);
}
