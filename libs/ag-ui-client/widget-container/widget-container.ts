import { MessageProcessor, Surface } from '@a2ui/angular';
import type { Types } from '@a2ui/lit/0.8';
import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { AgUiWidget } from '../ag-ui-types';

@Component({
  selector: 'app-widget-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, Surface],
  template: `
    @if (a2uiSurface(); as surface) {
      <a2ui-surface [surfaceId]="widget().a2uiSurfaceId!" [surface]="surface" />
    } @else if (widget().component) {
      <ng-container
        *ngComponentOutlet="widget().component!; inputs: widget().props!" />
    }
  `,
})
export class WidgetContainerComponent {
  private readonly processor = inject(MessageProcessor);
  readonly widget = input.required<AgUiWidget>();

  protected readonly a2uiSurface = signal<Types.Surface | null>(null);

  constructor() {
    effect(() => {
      this.syncA2uiSurface();
    });
  }

  private syncA2uiSurface(): void {
    const w = this.widget();
    if (!w.a2uiMessages || !w.a2uiSurfaceId) {
      this.a2uiSurface.set(null);
      return;
    }
    this.processor.processMessages(w.a2uiMessages as never);
    this.a2uiSurface.set(
      this.processor.getSurfaces().get(w.a2uiSurfaceId) ?? null,
    );
  }
}
