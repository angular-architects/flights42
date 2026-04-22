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
    const columnId = `${prefix}-column`;
    const titleId = `${prefix}-title`;
    const flightNoId = `${prefix}-flight-no`;
    const dateId = `${prefix}-date`;
    const delayId = `${prefix}-delay`;

    const columnChildren = [titleId, flightNoId, dateId, delayId];

    const components: BuiltComponent['components'] = [
      {
        id: titleId,
        component: 'Text',
        text: { path: `${dataPath}/title` },
        variant: 'h3',
      },
      {
        id: flightNoId,
        component: 'Text',
        text: { path: `${dataPath}/flightNo` },
        variant: 'caption',
      },
      {
        id: dateId,
        component: 'Text',
        text: { path: `${dataPath}/date` },
        variant: 'body',
      },
      {
        id: delayId,
        component: 'Text',
        text: { path: `${dataPath}/delay` },
        variant: 'body',
      },
    ];
    const dataValue: Record<string, unknown> = {
      title: `${flight.from} -> ${flight.to}`,
      flightNo: `Flight #${flight.id}`,
      date: `Date: ${formatFlightDate(flight.date)}`,
      delay: `Delay: ${flight.delay} min`,
    };

    if (status === 'booked') {
      const buttonId = `${prefix}-checkin-btn`;
      const buttonLabelId = `${prefix}-checkin-label`;
      columnChildren.push(buttonId);

      components.push({
        id: buttonLabelId,
        component: 'Text',
        text: { path: `${dataPath}/checkInLabel` },
        variant: 'body',
      });
      components.push({
        id: buttonId,
        component: 'Button',
        child: buttonLabelId,
        action: {
          event: {
            name: 'checkIn',
            context: {
              flightId: flight.id,
            },
          },
        },
      });

      dataValue['checkInLabel'] = 'Check in';
    }

    return {
      rootId: cardId,
      components: [
        {
          id: cardId,
          component: 'Card',
          child: columnId,
        },
        {
          id: columnId,
          component: 'Column',
          children: columnChildren,
        },
        ...components,
      ],
      dataModelUpdate: {
        path: dataPath,
        value: dataValue,
      },
    };
  },
});
