import { SurfaceComponent } from '@a2ui/angular/v0_9';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-a2ui-surface-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SurfaceComponent],
  template: `<a2ui-v09-surface [surfaceId]="surfaceId()" />`,
})
export class A2uiSurfaceWidgetComponent {
  readonly surfaceId = input.required<string>();
}
