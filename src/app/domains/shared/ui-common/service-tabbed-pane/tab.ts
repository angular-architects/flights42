import { Component, computed, inject, input } from '@angular/core';

import { TabInfo, TabRegistry } from './tab-registry';

@Component({
  selector: 'app-tab',
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
export class Tab implements TabInfo {
  private registry = inject(TabRegistry);
  readonly title = input.required<string>();

  protected readonly visible = computed(
    () => this.registry.currentTab() === this,
  );

  constructor() {
    this.registry.registerTab(this);
  }
}
