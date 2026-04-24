import { A2uiRendererService, SurfaceComponent } from '@a2ui/angular/v0_9';
import type { A2uiClientAction } from '@a2ui/web_core/v0_9';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';

import { createSimpleCard, type Passenger } from './passenger-card';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SurfaceComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly renderer = inject(A2uiRendererService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly surfaceId = 'passenger-card-surface';

  constructor() {
    this.render();
    this.registerHandler();
  }

  private render(): void {
    const passenger: Passenger = {
      id: 42,
      firstName: 'Anna',
      lastName: 'Miller',
      bonusMiles: 1200,
    };
    this.renderer.processMessages(createSimpleCard(this.surfaceId, passenger));
  }

  private registerHandler(): void {
    const subscription = this.renderer.surfaceGroup.onAction.subscribe(
      (action: A2uiClientAction) => {
        console.log('[A2UI Event]', action);

        if (action.name !== 'increaseMiles') {
          return;
        }

        const passenger = action.context['passenger'] as Passenger;
        this.renderer.processMessages([
          {
            version: 'v0.9',
            updateDataModel: {
              surfaceId: this.surfaceId,
              path: '/passenger',
              value: {
                ...passenger,
                bonusMiles: passenger.bonusMiles + 300,
              },
            },
          },
        ]);
      },
    );

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }
}
