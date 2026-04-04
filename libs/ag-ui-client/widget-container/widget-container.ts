import { Surface } from '@a2ui/angular';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { type AgUiWidget } from '../ag-ui-types';

@Component({
  selector: 'app-widget-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Surface],
  template: `
    @if (widget().a2uiSurface; as surface) {
      <a2ui-surface
        [surfaceId]="widget().a2uiSurfaceId"
        [surface]="surface" />
    }
  `,
})
export class WidgetContainerComponent {
  readonly widget = input.required<AgUiWidget>();
}
