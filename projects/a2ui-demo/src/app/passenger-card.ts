import type { A2uiMessage } from '@a2ui/web_core/v0_9';

import { customCatalog } from './custom-catalog/custom-catalog';

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
        catalogId: customCatalog.id,
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
            text: {
              call: 'formatId',
              args: {
                value: { path: '/passenger/id' },
              },
              returnType: 'string',
            },
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
            text: {
              call: 'formatNumber',
              args: {
                value: { path: '/passenger/bonusMiles' },
                decimals: 0,
              },
              returnType: 'string',
            },
            variant: 'body',
          },
          {
            id: 'miles-progress',
            component: 'MilesProgress',
            passenger: { path: '/passenger' },
          },
          {
            id: 'increase-button',
            component: 'Button',
            child: 'increase-button-label',
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
            id: 'increase-button-label',
            component: 'Text',
            text: 'Increase Miles',
            variant: 'body',
          },
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
