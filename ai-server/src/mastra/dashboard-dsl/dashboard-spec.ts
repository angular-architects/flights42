import { z } from 'zod';

import type { MacroInput } from '../a2ui/simple-macros/macro.js';

const positiveInt = z.number().int().positive();

export const flightsTableSchema = z.object({
  component: z.literal('FlightsTable'),
  from: z.string().describe('Departure city, e.g. "Graz".'),
  to: z.string().describe('Destination city, e.g. "Hamburg".'),
  maxRows: positiveInt
    .optional()
    .describe('Maximum number of flight rows to display. Defaults to 30.'),
});

export type FlightsTableNode = MacroInput<typeof flightsTableSchema>;

export const delayedFlightsTableSchema = z.object({
  component: z.literal('DelayedFlightsTable'),
  from: z.string(),
  to: z.string(),
  maxRows: positiveInt
    .optional()
    .describe('Maximum number of flight rows to display. Defaults to 30.'),
});

export type DelayedFlightsTableNode = MacroInput<
  typeof delayedFlightsTableSchema
>;

export const delayShareChartSchema = z.object({
  component: z.literal('DelayShareChart'),
  from: z.string(),
  to: z.string(),
  chartType: z.enum(['pie', 'bar']).optional().describe('Defaults to "pie".'),
});

export type DelayShareChartNode = MacroInput<typeof delayShareChartSchema>;

export const delaysPerDayChartSchema = z.object({
  component: z.literal('DelaysPerDayChart'),
  from: z.string(),
  to: z.string(),
});

export type DelaysPerDayChartNode = MacroInput<typeof delaysPerDayChartSchema>;

export const boardingPassesSchema = z.object({
  component: z.literal('BoardingPasses'),
  count: positiveInt
    .max(8)
    .optional()
    .describe('Number of upcoming booked flights to show. Defaults to 2.'),
});

export type BoardingPassesNode = MacroInput<typeof boardingPassesSchema>;

export const bookedFlightsListSchema = z.object({
  component: z.literal('BookedFlightsList'),
  showCheckInButton: z
    .boolean()
    .optional()
    .describe(
      'Whether to render a "Check in" button per booked flight. Defaults to true.',
    ),
  showWeather: z
    .boolean()
    .optional()
    .describe(
      'Whether to enrich each flight entry with a weather forecast for the destination. Defaults to true.',
    ),
  maxRows: positiveInt
    .optional()
    .describe(
      'Maximum number of booked flights to list. Defaults to no limit.',
    ),
});

export type BookedFlightsListNode = MacroInput<typeof bookedFlightsListSchema>;

export const flightSearchSchema = z.object({
  component: z.literal('FlightSearch'),
  defaultFrom: z.string().optional().describe('Defaults to "Graz".'),
  defaultTo: z.string().optional().describe('Defaults to "Hamburg".'),
});

export type FlightSearchNode = MacroInput<typeof flightSearchSchema>;

export const rentalCarsSchema = z.object({
  component: z.literal('RentalCars'),
  city: z
    .string()
    .optional()
    .describe(
      'Defaults to the destination of the next booked flight, otherwise "Hamburg".',
    ),
  maxItems: positiveInt
    .optional()
    .describe('Maximum number of cars to list. Defaults to no limit.'),
});

export type RentalCarsNode = MacroInput<typeof rentalCarsSchema>;

export const hotelsSchema = z.object({
  component: z.literal('Hotels'),
  city: z.string().optional(),
  maxItems: positiveInt
    .optional()
    .describe('Maximum number of hotels to list. Defaults to no limit.'),
});

export type HotelsNode = MacroInput<typeof hotelsSchema>;

export const weatherListSchema = z.object({
  component: z.literal('WeatherList'),
  maxRows: positiveInt
    .optional()
    .describe(
      'Maximum number of destination forecasts to list. Defaults to no limit.',
    ),
});

export type WeatherListNode = MacroInput<typeof weatherListSchema>;

export const flightRouteSchema = z.object({
  component: z.literal('FlightRoute'),
  flightId: positiveInt.describe('Id of the flight, e.g. 42.'),
});

export const dashboardSchema = z.object({
  component: z.literal('Dashboard'),
  children: z
    .array(z.string())
    .meta({ $ref: 'common_types.json#/$defs/ChildList' }),
});

export type DashboardNode = MacroInput<typeof dashboardSchema>;
