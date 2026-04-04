import { Surface } from '@a2ui/angular';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { type AgUiWidget } from '../ag-ui-types';

@Component({
  selector: 'app-widget-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Surface],
  template: `
    @let surface = widget().a2uiSurface;
    @let surfaceId = widget().a2uiSurfaceId;
    @if (surface) {
      <a2ui-surface [surfaceId]="surfaceId" [surface]="surface" />
    }
  `,
})
export class WidgetContainerComponent {
  readonly widget = input.required<AgUiWidget>();
}
