import { computed, Injectable, Signal, signal } from '@angular/core';

export interface TabInfo {
  title: Signal<string>;
}

// No { providedIn: 'root' }!
// This service is provided in the tabbed-pane
@Injectable()
export class TabRegistry {
  private readonly _current = signal(0);
  private readonly _tabs = signal<TabInfo[]>([]);

  readonly current = this._current.asReadonly();
  readonly tabs = this._tabs.asReadonly();
  readonly currentTab = computed(() => this.tabs()[this.current()]);

  registerTab(tab: TabInfo): void {
    this._tabs.update((tabs) => [...tabs, tab]);
  }

  activate(tabIndex: number): void {
    this._current.set(tabIndex);
  }
}
