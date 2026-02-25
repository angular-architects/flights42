import {
  Component,
  computed,
  contentChildren,
  effect,
  model,
} from '@angular/core';

import { Tab } from './tab';

@Component({
  selector: 'app-tabbed-pane',
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
      margin-bottom: 20px;
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
  protected readonly current = model(0);
  protected readonly tabs = contentChildren(Tab);

  // protected readonly tabs = contentChildren<Tab>('tab');
  // protected readonly tabs = contentChildren(Tab, { descendants: true });

  readonly currentTab = computed(() => this.tabs()[this.current()]);

  constructor() {
    effect(() => {
      for (const tab of this.tabs()) {
        tab.pane = this;
      }
    });
  }

  activate(tabIndex: number): void {
    this.current.set(tabIndex);
  }
}

// Further options

// protected readonly tabElements = contentChildren(Tab, { read: ElementRef });
// protected readonly tabViewContainers = contentChildren(Tab, { read: ViewContainerRef });

// for (const element of this.tabElements()) {
//   element.nativeElement.style.color = 'green';
// }

// for (const container of this.tabViewContainers()) {
//   container.createComponent(Home);
// }
