import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  InjectionToken,
  Injector,
  input,
} from '@angular/core';

import { AgUiWidgetInstance } from '../ag-ui-types';

// Stable id of the widget instance, provided to the dynamically rendered
// widget component so it can identify itself (e.g. for de-duplication).
export const AG_UI_WIDGET_ID = new InjectionToken<string>('AG_UI_WIDGET_ID');

@Component({
  selector: 'app-widget-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    <ng-container
      *ngComponentOutlet="
        widget().component;
        inputs: widgetInputs();
        injector: widgetInjector()
      " />
  `,
})
export class WidgetContainerComponent {
  readonly widget = input.required<AgUiWidgetInstance>();

  private readonly parentInjector = inject(Injector);
  private readonly injectorCache = new Map<string, Injector>();

  protected readonly widgetInputs = computed(() => this.widget().props);

  protected readonly widgetInjector = computed(() => {
    const { id } = this.widget();
    let injector = this.injectorCache.get(id);
    if (!injector) {
      injector = Injector.create({
        parent: this.parentInjector,
        providers: [{ provide: AG_UI_WIDGET_ID, useValue: id }],
      });
      this.injectorCache.set(id, injector);
    }
    return injector;
  });
}
