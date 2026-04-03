import { Surface } from '@a2ui/angular';
import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AgUiWidget } from '../ag-ui-types';

@Component({
  selector: 'app-widget-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, Surface],
  template: `
    @if (widget().component; as comp) {
      <ng-container
        *ngComponentOutlet="comp; inputs: widget().props ?? {}" />
    } @else if (widget().a2uiSurface; as surface) {
      <a2ui-surface
        [surfaceId]="widget().a2uiSurfaceId ?? ''"
        [surface]="surface" />
    }
  `,
})
export class WidgetContainerComponent {
  readonly widget = input.required<AgUiWidget>();
}
