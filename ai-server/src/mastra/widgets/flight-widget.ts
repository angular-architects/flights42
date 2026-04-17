import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import {
  type BuiltComponent,
  defineServerWidget,
} from '../../../../libs/ag-ui-server/index.js';

const flightSchema = z.object({
  id: z.number().describe('Unique id of the flight'),
  from: z.string().describe('Departure city'),
  to: z.string().describe('Destination city'),
  date: z.string().describe('ISO date-time of the flight'),
  delay: z.number().describe('Delay in minutes (0 if on time)'),
});

function formatFlightDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  const pad = (value: number): string => value.toString().padStart(2, '0');
  const day = pad(parsed.getDate());
  const month = pad(parsed.getMonth() + 1);
  const year = parsed.getFullYear();
  const hours = pad(parsed.getHours());
  const minutes = pad(parsed.getMinutes());
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export const flightWidget = defineServerWidget({
  name: 'flightWidget',
  description: [
    'Renders a compact flight card.',
    'Use status "booked" for flights already booked by the passenger. In that case a Check-in button is shown.',
    'Use status "other" for unbooked / search-result flights.',
  ].join('\n'),
  schema: z.object({
    flight: flightSchema,
    status: z
      .enum(['booked', 'other'])
      .describe('Booking status of the flight.'),
  }),
  build: ({ flight, status }): BuiltComponent => {
    const instanceId = `${flight.id}-${randomUUID().slice(0, 8)}`;
    const prefix = `flight-${instanceId}`;
    const dataPath = `/flights/${instanceId}`;

    const cardId = `${prefix}-card`;
    const titleId = `${prefix}-title`;
    const flightNoId = `${prefix}-flight-no`;
    const dateId = `${prefix}-date`;
    const delayId = `${prefix}-delay`;

    const cardChildren = [titleId, flightNoId, dateId, delayId];

    const components: BuiltComponent['components'] = [
      {
        id: titleId,
        component: {
          Text: {
            text: { path: `${dataPath}/title` },
            usageHint: 'h3',
          },
        },
      },
      {
        id: flightNoId,
        component: {
          Text: {
            text: { path: `${dataPath}/flightNo` },
            usageHint: 'caption',
          },
        },
      },
      {
        id: dateId,
        component: {
          Text: {
            text: { path: `${dataPath}/date` },
            usageHint: 'body',
          },
        },
      },
      {
        id: delayId,
        component: {
          Text: {
            text: { path: `${dataPath}/delay` },
            usageHint: 'body',
          },
        },
      },
    ];

    const dataContents: { key: string; valueString: string }[] = [
      { key: 'title', valueString: `${flight.from} → ${flight.to}` },
      { key: 'flightNo', valueString: `Flight #${flight.id}` },
      { key: 'date', valueString: `Date: ${formatFlightDate(flight.date)}` },
      { key: 'delay', valueString: `Delay: ${flight.delay} min` },
    ];

    if (status === 'booked') {
      const buttonId = `${prefix}-checkin-btn`;
      const buttonLabelId = `${prefix}-checkin-label`;
      cardChildren.push(buttonId);

      components.push({
        id: buttonLabelId,
        component: {
          Text: {
            text: { path: `${dataPath}/checkInLabel` },
            usageHint: 'body',
          },
        },
      });
      components.push({
        id: buttonId,
        component: {
          Button: {
            child: buttonLabelId,
            action: {
              name: 'checkIn',
              context: [
                { key: 'flightId', value: { literalNumber: flight.id } },
              ],
            },
          },
        },
      });

      dataContents.push({ key: 'checkInLabel', valueString: 'Check in' });
    }

    return {
      rootId: cardId,
      components: [
        {
          id: cardId,
          component: {
            Card: {
              children: { explicitList: cardChildren },
            },
          },
        },
        ...components,
      ],
      dataModelUpdate: {
        path: dataPath,
        contents: dataContents,
      },
    };
  },
});
