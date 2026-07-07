import { NgComponentOutlet } from '@angular/common';
import { SurfaceComponent } from '@a2ui/angular/v0_9';
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
  imports: [NgComponentOutlet, SurfaceComponent],
  template: `
    @let currentWidget = widget();
    @if (currentWidget.kind === 'a2ui') {
      <a2ui-v09-surface [surfaceId]="currentWidget.a2uiSurfaceId" />
    } @else {
      <ng-container
        *ngComponentOutlet="currentWidget.component; inputs: widgetInputs()" />
    }
  `,
})
export class WidgetContainerComponent {
  readonly widget = input.required<AgUiWidgetInstance>();

  protected readonly widgetInputs = computed(() => {
    const widget = this.widget();
    return widget.kind === 'action'
      ? {
          actionData: widget.data,
        }
      : widget.kind === 'a2ui'
        ? {}
        : widget.props;
  });
}
