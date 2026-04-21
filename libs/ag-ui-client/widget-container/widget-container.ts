import { SurfaceComponent } from '@a2ui/angular/v0_9';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { type AgUiWidget } from '../ag-ui-types';

@Component({
  selector: 'app-widget-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SurfaceComponent],
  template: `
    @let surfaceId = widget().a2uiSurfaceId;
    @if (surfaceId) {
      <a2ui-v09-surface [surfaceId]="surfaceId" />
    }
  `,
})
export class WidgetContainerComponent {
  readonly widget = input.required<AgUiWidget>();
}
