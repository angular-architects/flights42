import { Surface } from '@a2ui/angular';
import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import {
  type AgUiWidget,
  isAgUiA2uiWidget,
  isAgUiComponentWidget,
} from '../ag-ui-types';

@Component({
  selector: 'app-widget-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, Surface],
  template: `
    @if (componentWidget(); as cw) {
      <ng-container *ngComponentOutlet="cw.component; inputs: cw.props" />
    } @else if (a2uiWidget(); as aw) {
      @if (aw.a2uiSurface; as surface) {
        <a2ui-surface
          [surfaceId]="aw.a2uiSurfaceId ?? ''"
          [surface]="surface" />
      }
    }
  `,
})
export class WidgetContainerComponent {
  readonly widget = input.required<AgUiWidget>();

  readonly componentWidget = computed(() => {
    const w = this.widget();
    return isAgUiComponentWidget(w) ? w : undefined;
  });

  readonly a2uiWidget = computed(() => {
    const w = this.widget();
    return isAgUiA2uiWidget(w) ? w : undefined;
  });
}
