import { z } from 'zod';

const positiveInt = z.number().int().positive();

export const flightsTableSchema = z.object({
  component: z.literal('FlightsTable'),
  from: z.string().describe('Departure city, e.g. "Graz".'),
  to: z.string().describe('Destination city, e.g. "Hamburg".'),
  maxRows: positiveInt
    .nullish()
    .describe('Maximum number of flight rows to display. Defaults to 30.'),
});

export const delayedFlightsTableSchema = z.object({
  component: z.literal('DelayedFlightsTable'),
  from: z.string(),
  to: z.string(),
  maxRows: positiveInt
    .nullish()
    .describe('Maximum number of flight rows to display. Defaults to 30.'),
});

export const delayShareChartSchema = z.object({
  component: z.literal('DelayShareChart'),
  from: z.string(),
  to: z.string(),
  chartType: z.enum(['pie', 'bar']).nullish().describe('Defaults to "pie".'),
});

export const delaysPerDayChartSchema = z.object({
  component: z.literal('DelaysPerDayChart'),
  from: z.string(),
  to: z.string(),
});

export const boardingPassesSchema = z.object({
  component: z.literal('BoardingPasses'),
  count: positiveInt
    .max(8)
    .nullish()
    .describe('Number of upcoming booked flights to show. Defaults to 2.'),
});

export const bookedFlightsListSchema = z.object({
  component: z.literal('BookedFlightsList'),
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
});

export const flightSearchSchema = z.object({
  component: z.literal('FlightSearch'),
  defaultFrom: z.string().nullish().describe('Defaults to "Graz".'),
  defaultTo: z.string().nullish().describe('Defaults to "Hamburg".'),
});

export const rentalCarsSchema = z.object({
  component: z.literal('RentalCars'),
  city: z
    .string()
    .nullish()
    .describe(
      'Defaults to the destination of the next booked flight, otherwise "Hamburg".',
    ),
  maxItems: positiveInt
    .nullish()
    .describe('Maximum number of cars to list. Defaults to no limit.'),
});

export const hotelsSchema = z.object({
  component: z.literal('Hotels'),
  city: z.string().nullish(),
  maxItems: positiveInt
    .nullish()
    .describe('Maximum number of hotels to list. Defaults to no limit.'),
});

export const weatherListSchema = z.object({
  component: z.literal('WeatherList'),
  maxRows: positiveInt
    .nullish()
    .describe(
      'Maximum number of destination forecasts to list. Defaults to no limit.',
    ),
});

export const dashboardSchema = z.object({
  component: z.literal('Dashboard'),
  children: z
    .array(z.string())
    .meta({ $ref: 'common_types.json#/$defs/ChildList' }),
});

export const dashboardTileSchema = z.discriminatedUnion('component', [
  flightsTableSchema,
  delayedFlightsTableSchema,
  delayShareChartSchema,
  delaysPerDayChartSchema,
  boardingPassesSchema,
  bookedFlightsListSchema,
  flightSearchSchema,
  rentalCarsSchema,
  hotelsSchema,
  weatherListSchema,
]);

export const dashboardSpecSchema = z.object({
  tiles: z.array(dashboardTileSchema).min(1),
});

export type DashboardTile = z.infer<typeof dashboardTileSchema>;
export type DashboardSpec = z.infer<typeof dashboardSpecSchema>;
