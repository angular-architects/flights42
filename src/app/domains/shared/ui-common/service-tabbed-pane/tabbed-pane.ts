import { Component, inject } from '@angular/core';

import { TabRegistry } from './tab-registry';

@Component({
  selector: 'app-tabbed-pane',
  providers: [TabRegistry],
  imports: [],
  template: `
    <div class="pane">
      <div class="tabs-header" role="group">
        @for (tab of tabs(); track tab) {
          <button
            class="tab-button"
            [class.active]="tab === currentTab()"
            (click)="activate($index)">
            {{ tab.title() }}
          </button>
        }
      </div>
      <div class="tabs-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: `
    .pane {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      width: 100%;
      padding: 25px;
      background-color: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
    }

    .tabs-header {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #e0e0e0;
    }

    .tab-button {
      padding: 10px 20px;
      border: none;
      border-radius: 0;
      background: transparent;
      color: #666;
      font-size: 14px;
      cursor: pointer;
      transition: color 0.2s ease;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }

    .tab-button:hover {
      color: #333;
    }

    .tab-button.active {
      color: #1976d2;
      border-bottom: 2px solid #1976d2;
      border-radius: 0;
    }

    .tabs-content {
      padding: 20px;
      background-color: #fff;
      margin-top: 0;
    }
  `,
})
export class TabbedPane {
  protected readonly registry = inject(TabRegistry);
  protected readonly tabs = this.registry.tabs;
  protected readonly currentTab = this.registry.currentTab;

  activate(tabIndex: number): void {
    this.registry.activate(tabIndex);
  }
}
