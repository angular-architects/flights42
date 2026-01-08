import { Component, computed, contentChildren, model } from '@angular/core';

import { TabComponent } from './tab';

@Component({
  selector: 'app-tabbed-pane',
  standalone: true,
  imports: [],
  template: `
    <div class="pane">
      <div class="nav" role="group">
        @for (tab of tabs(); track tab) {
          <button
            [class.secondary]="tab !== currentTab()"
            (click)="activate($index)">
            {{ tab.title() }}
          </button>
        }
      </div>
      <article>
        <ng-content></ng-content>
      </article>
    </div>
  `,
  styles: ``,
})
export class TabbedPaneComponent {
  protected readonly current = model(0);
  protected readonly tabs = contentChildren(TabComponent);

  readonly currentTab = computed(() => this.tabs()[this.current()]);

  activate(tabIndex: number): void {
    this.current.set(tabIndex);
  }
}
