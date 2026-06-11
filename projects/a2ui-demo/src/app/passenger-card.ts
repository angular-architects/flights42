import { BasicCatalog } from '@a2ui/angular/v0_9';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';

const basicCatalogId = new BasicCatalog().id;

export interface Passenger {
  id: number;
  firstName: string;
  lastName: string;
  bonusMiles: number;
}

export function createSurfaceMessages(
  surfaceId: string,
  passenger: Passenger,
): A2uiMessage[] {
  return [
    {
      version: 'v0.9',
      createSurface: {
        surfaceId,
        catalogId: basicCatalogId,
      },
    },
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId,
        components: [
          {
            id: 'root',
            component: 'Column',
            children: ['passenger-card', 'miles-progress'],
          },
          {
            id: 'passenger-card',
            component: 'Card',
            child: 'passenger-card-column',
          },
          {
            id: 'passenger-card-column',
            component: 'Column',
            children: ['headline', 'details', 'increase-button'],
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

          // TODO: Add label for firstName
          { id: 'passenger-first-name-label', component: 'Text' },

          // TODO: Add value for firstName
          { id: 'passenger-first-name-value', component: 'Text' },

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
            // TODO: Format bonus miles using a comma as thousands separator
            //       Example: 1,200 for 1200
            text: { path: '/passenger/bonusMiles' },
            variant: 'body',
          },

          // TODO: Add button with label "Increase Miles"
          //       Replace the following text component by a button
          //       Trigger an action increaseMiles providing a context with:
          //       id, firstName, lastName, bonusMiles
          { id: 'increase-button', component: 'Text' },

          // TODO: Use Custom MilesProgress component
          //       Replace the following Text component by a MilesProgress
          // HINT: Switch to custom catalog in app.config.ts first
          { id: 'miles-progress', component: 'Text' },
        ],
      },
    },
    toUpdateMessage(surfaceId, passenger),
  ];
}

export function toUpdateMessage(
  surfaceId: string,
  passenger: Passenger,
): A2uiMessage {
  return {
    version: 'v0.9',
    updateDataModel: {
      surfaceId,
      path: '/passenger',
      value: passenger,
    },
  };
}
