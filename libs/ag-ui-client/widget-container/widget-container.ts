import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { AgUiWidgetInstance } from '../ag-ui-types';

@Component({
  selector: 'app-widget-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    <ng-container
      *ngComponentOutlet="widget().component; inputs: widgetInputs()" />
  `,
})
export class WidgetContainerComponent {
  readonly widget = input.required<AgUiWidgetInstance>();

  protected readonly widgetInputs = computed(() => {
    const widget = this.widget();
    return widget.kind === 'action' ? { data: widget.data } : widget.props;
  });
}
