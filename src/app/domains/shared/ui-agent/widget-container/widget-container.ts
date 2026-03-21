import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AgUiWidget } from '../ag-ui-types';

@Component({
  selector: 'app-widget-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    <ng-container
      *ngComponentOutlet="widget().component; inputs: widget().props" />
  `,
})
export class WidgetContainerComponent {
  readonly widget = input.required<AgUiWidget>();
}
