import { A2uiRendererService, SurfaceComponent } from '@a2ui/angular/v0_9';
import type { A2uiClientAction, A2uiMessage } from '@a2ui/web_core/v0_9';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';

import { customCatalog } from './custom-catalog/custom-catalog';

interface Passenger {
  id: number;
  firstName: string;
  lastName: string;
  bonusMiles: number;
}

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
    this.renderer.processMessages(this.createSurfaceMessages(passenger));
  }

  private registerHandler(): void {
    const subscription = this.renderer.surfaceGroup.onAction.subscribe(
      (action: A2uiClientAction) => {
        console.log('[A2UI Event]', action);

        if (action.name !== 'increaseMiles') {
          return;
        }

        const passenger = action.context as unknown as Passenger;
        this.renderer.processMessages([
          this.toUpdateMessage({
            ...passenger,
            bonusMiles: passenger.bonusMiles + 300,
          }),
        ]);
      },
    );

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }

  private createSurfaceMessages(passenger: Passenger): A2uiMessage[] {
    return [
      {
        version: 'v0.9',
        createSurface: {
          surfaceId: this.surfaceId,
          catalogId: customCatalog.id,
        },
      },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: this.surfaceId,
          components: [
            {
              id: 'root',
              component: 'Column',
              children: ['passenger-card', 'miles-progress'],
            },
            {
              id: 'passenger-card',
              component: 'Card',
              children: ['headline', 'details', 'select-button'],
            },
            {
              id: 'headline',
              component: 'Text',
              text: 'Passenger Card',
              variant: 'h2',
            },
            {
              id: 'details',
              component: 'Row',
              children: ['labels-column', 'values-column'],
              align: 'flex-start',
            },
            {
              id: 'labels-column',
              component: 'Column',
              children: [
                'passenger-id-label',
                'passenger-first-name-label',
                'passenger-last-name-label',
                'passenger-bonus-miles-label',
              ],
            },
            {
              id: 'values-column',
              component: 'Column',
              children: [
                'passenger-id-value',
                'passenger-first-name-value',
                'passenger-last-name-value',
                'passenger-bonus-miles-value',
              ],
            },
            {
              id: 'passenger-id-label',
              component: 'Text',
              text: 'ID: ',
              variant: 'body',
            },
            {
              id: 'passenger-id-value',
              component: 'Text',
              text: { path: '/passenger/id' },
              variant: 'body',
            },
            {
              id: 'passenger-first-name-label',
              component: 'Text',
              text: 'First name: ',
              variant: 'body',
            },
            {
              id: 'passenger-first-name-value',
              component: 'Text',
              text: { path: '/passenger/firstName' },
              variant: 'body',
            },
            {
              id: 'passenger-last-name-label',
              component: 'Text',
              text: 'Last name: ',
              variant: 'body',
            },
            {
              id: 'passenger-last-name-value',
              component: 'Text',
              text: { path: '/passenger/lastName' },
              variant: 'body',
            },
            {
              id: 'passenger-bonus-miles-label',
              component: 'Text',
              text: 'Bonus miles: ',
              variant: 'body',
            },
            {
              id: 'passenger-bonus-miles-value',
              component: 'Text',
              text: { path: '/passenger/bonusMiles' },
              variant: 'body',
            },
            {
              id: 'miles-progress',
              component: 'MilesProgress',
              label: 'Miles Progress',
              miles: { path: '/passenger/bonusMiles' },
            },
            {
              id: 'select-button',
              component: 'Button',
              child: 'select-button-label',
              action: {
                event: {
                  name: 'increaseMiles',
                  context: {
                    id: { path: '/passenger/id' },
                    firstName: { path: '/passenger/firstName' },
                    lastName: { path: '/passenger/lastName' },
                    bonusMiles: { path: '/passenger/bonusMiles' },
                  },
                },
              },
            },
            {
              id: 'select-button-label',
              component: 'Text',
              text: 'Increase Miles',
              variant: 'body',
            },
          ],
        },
      },
      this.toUpdateMessage(passenger),
    ];
  }

  private toUpdateMessage(passenger: Passenger): A2uiMessage {
    return {
      version: 'v0.9',
      updateDataModel: {
        surfaceId: this.surfaceId,
        path: '/passenger',
        value: passenger,
      },
    };
  }
}
