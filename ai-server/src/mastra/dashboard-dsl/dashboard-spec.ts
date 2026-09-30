import { z } from 'zod';

const positiveInt = z.number().int().positive();

export const dashboardTileSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('flightsTable'),
    from: z.string().describe('Departure city, e.g. "Graz".'),
    to: z.string().describe('Destination city, e.g. "Hamburg".'),
    maxRows: positiveInt
      .nullish()
      .describe('Maximum number of flight rows to display. Defaults to 30.'),
  }),
  z.object({
    type: z.literal('delayedFlightsTable'),
    from: z.string(),
    to: z.string(),
    maxRows: positiveInt
      .nullish()
      .describe('Maximum number of flight rows to display. Defaults to 30.'),
  }),
  z.object({
    type: z.literal('delayShareChart'),
    from: z.string(),
    to: z.string(),
    chartType: z.enum(['pie', 'bar']).nullish().describe('Defaults to "pie".'),
  }),
  z.object({
    type: z.literal('delaysPerDayChart'),
    from: z.string(),
    to: z.string(),
  }),
  z.object({
    type: z.literal('boardingPasses'),
    count: positiveInt
      .max(8)
      .nullish()
      .describe('Number of upcoming booked flights to show. Defaults to 2.'),
  }),
  z.object({
    type: z.literal('bookedFlightsList'),
    showCheckInButton: z
      .boolean()
      .nullish()
      .describe(
        'Whether to render a "Check in" button per booked flight. Defaults to true.',
      ),
    showWeather: z
      .boolean()
      .nullish()
      .describe(
        'Whether to enrich each flight entry with a weather forecast for the destination. Defaults to true.',
      ),
    maxRows: positiveInt
      .nullish()
      .describe(
        'Maximum number of booked flights to list. Defaults to no limit.',
      ),
  }),
  z.object({
    type: z.literal('flightSearch'),
    defaultFrom: z.string().nullish().describe('Defaults to "Graz".'),
    defaultTo: z.string().nullish().describe('Defaults to "Hamburg".'),
  }),
  z.object({
    type: z.literal('rentalCars'),
    city: z
      .string()
      .nullish()
      .describe(
        'Defaults to the destination of the next booked flight, otherwise "Hamburg".',
      ),
    maxItems: positiveInt
      .nullish()
      .describe('Maximum number of cars to list. Defaults to no limit.'),
  }),
  z.object({
    type: z.literal('hotels'),
    city: z.string().nullish(),
    maxItems: positiveInt
      .nullish()
      .describe('Maximum number of hotels to list. Defaults to no limit.'),
  }),
  z.object({
    type: z.literal('weatherList'),
    maxRows: positiveInt
      .nullish()
      .describe(
        'Maximum number of destination forecasts to list. Defaults to no limit.',
      ),
  }),
  z.object({
    type: z.literal('text'),
    title: z.string(),
    text: z.string(),
  }),
  z.object({
    type: z.literal('image'),
    title: z.string(),
    url: z
      .string()
      .describe('URL of the image file itself, not of a web page.'),
    caption: z.string().nullish(),
  }),
  z.object({
    type: z.literal('table'),
    title: z.string(),
    columns: z.array(z.string()).min(1),
    rows: z
      .array(z.array(z.string()))
      .describe('One array of cell texts per row, in column order.'),
  }),
]);

export const dashboardSpecSchema = z.object({
  tiles: z.array(dashboardTileSchema).min(1),
});

export type DashboardTile = z.infer<typeof dashboardTileSchema>;
export type DashboardSpec = z.infer<typeof dashboardSpecSchema>;
