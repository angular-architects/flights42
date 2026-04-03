import { MessageProcessor, Surface } from '@a2ui/angular';
import { Types } from '@a2ui/lit/0.8';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface Passenger {
  id: number;
  firstName: string;
  lastName: string;
  bonusMiles: number;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Surface],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly processor = inject(MessageProcessor);

  protected readonly surfaceId = 'passenger-card-surface';
  protected readonly surface = signal<Types.Surface | undefined>(undefined);

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
    this.processor.clearSurfaces();
    this.processor.processMessages(this.createSurfaceMessages(passenger));
    const surface = this.processor.getSurfaces().get(this.surfaceId);
    this.surface.set(surface);
  }

  private registerHandler() {
    this.processor.events
      .pipe(takeUntilDestroyed())
      .subscribe(({ message, completion }) => {
        const action = message.userAction;
        console.log('[A2UI Event]', action);

        if (action && action.name === 'increaseMiles' && action.context) {
          const passenger = action.context as unknown as Passenger;
          const updateMessage = this.toUpdateMessage({
            ...passenger,
            bonusMiles: passenger.bonusMiles + 300,
          });
          const updates = [updateMessage];
          this.processor.processMessages(updates);
        }

        completion.next([]);
      });
  }

  private createSurfaceMessages(
    passenger: Passenger,
  ): Types.ServerToClientMessage[] {
    return [
      {
        surfaceUpdate: {
          surfaceId: this.surfaceId,
          components: [
            {
              id: 'root',
              component: {
                Card: {
                  children: {
                    explicitList: ['headline', 'details', 'select-button'],
                  },
                },
              },
            },
            {
              id: 'headline',
              component: {
                Text: {
                  text: { literalString: 'Passenger Card' },
                  usageHint: 'h2',
                },
              },
            },
            {
              id: 'details',
              component: {
                Row: {
                  children: {
                    explicitList: ['labels-column', 'values-column'],
                  },
                  alignment: 'start',
                },
              },
            },
            {
              id: 'labels-column',
              component: {
                Column: {
                  children: {
                    explicitList: [
                      'passenger-id-label',
                      'passenger-first-name-label',
                      'passenger-last-name-label',
                      'passenger-bonus-miles-label',
                    ],
                  },
                },
              },
            },
            {
              id: 'values-column',
              component: {
                Column: {
                  children: {
                    explicitList: [
                      'passenger-id-value',
                      'passenger-first-name-value',
                      'passenger-last-name-value',
                      'passenger-bonus-miles-value',
                    ],
                  },
                },
              },
            },
            {
              id: 'passenger-id-label',
              component: {
                Text: {
                  text: { literalString: 'ID: ' },
                  usageHint: 'body',
                },
              },
            },
            {
              id: 'passenger-id-value',
              component: {
                Text: {
                  text: { path: '/passenger/id' },
                  usageHint: 'body',
                },
              },
            },
            {
              id: 'passenger-first-name-label',
              component: {
                Text: {
                  text: { literalString: 'First name: ' },
                  usageHint: 'body',
                },
              },
            },
            {
              id: 'passenger-first-name-value',
              component: {
                Text: {
                  text: { path: '/passenger/firstName' },
                  usageHint: 'body',
                },
              },
            },
            {
              id: 'passenger-last-name-label',
              component: {
                Text: {
                  text: { literalString: 'Last name: ' },
                  usageHint: 'body',
                },
              },
            },
            {
              id: 'passenger-last-name-value',
              component: {
                Text: {
                  text: { path: '/passenger/lastName' },
                  usageHint: 'body',
                },
              },
            },
            {
              id: 'passenger-bonus-miles-label',
              component: {
                Text: {
                  text: { literalString: 'Bonus miles: ' },
                  usageHint: 'body',
                },
              },
            },
            {
              id: 'passenger-bonus-miles-value',
              component: {
                Text: {
                  text: { path: '/passenger/bonusMiles' },
                  usageHint: 'body',
                },
              },
            },
            {
              id: 'select-button',
              component: {
                Button: {
                  child: 'select-button-label',
                  action: {
                    name: 'increaseMiles',
                    context: [
                      { key: 'id', value: { path: '/passenger/id' } },
                      {
                        key: 'firstName',
                        value: { path: '/passenger/firstName' },
                      },
                      {
                        key: 'lastName',
                        value: { path: '/passenger/lastName' },
                      },
                      {
                        key: 'bonusMiles',
                        value: { path: '/passenger/bonusMiles' },
                      },
                    ],
                  },
                },
              },
            },
            {
              id: 'select-button-label',
              component: {
                Text: {
                  text: { literalString: 'Increase Miles' },
                  usageHint: 'body',
                },
              },
            },
          ],
        },
      },
      {
        dataModelUpdate: this.toUpdateMessage(passenger).dataModelUpdate,
      },
      {
        beginRendering: {
          surfaceId: this.surfaceId,
          root: 'root',
        },
      },
    ];
  }

  private toUpdateMessage(passenger: Passenger): Types.ServerToClientMessage {
    return {
      dataModelUpdate: {
        surfaceId: this.surfaceId,
        path: '/passenger',
        contents: this.toValueMap(passenger),
      },
    };
  }

  private toValueMap(passenger: Passenger): Types.ValueMap[] {
    return [
      this.toNumberValueMap('id', passenger.id),
      this.toStringValueMap('firstName', passenger.firstName),
      this.toStringValueMap('lastName', passenger.lastName),
      this.toNumberValueMap('bonusMiles', passenger.bonusMiles),
    ];
  }

  private toStringValueMap(key: string, value: string): Types.ValueMap {
    return { key, valueString: value } as Types.ValueMap;
  }

  private toNumberValueMap(key: string, value: number): Types.ValueMap {
    return { key, valueNumber: value } as Types.ValueMap;
  }
}
