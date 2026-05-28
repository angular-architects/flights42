import { z } from 'zod';

// Compact dashboard DSL.
//
// The LLM never produces A2UI directly anymore — it only produces this
// small spec. The server compiles it to a full A2UI surface
// deterministically. Tile types are intentionally limited to what the
// two example prompts shipped in `src/app/shell/dashboard/example-prompts.ts`
// require:
//
//   1) Flight analytics dashboard (Graz <-> Hamburg) with flight
//      tables, delayed-flight tables and the standard delay charts.
//   2) Personal travel dashboard with boarding passes, booked flights,
//      a flight-search tile, rental cars, hotels and a weather list.
//
// Adding a new tile type is a four-step change: extend the schema, add a
// builder in `compile-dashboard.ts`, mention it in the agent prompt, and
// (optionally) add a deterministic data fetcher.

const positiveInt = z.number().int().positive();

export const dashboardTileSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('flightsTable'),
    from: z.string().describe('Departure city, e.g. "Graz".'),
    to: z.string().describe('Destination city, e.g. "Hamburg".'),
    maxRows: positiveInt
      .optional()
      .describe('Maximum number of flight rows to display. Defaults to 30.'),
  }),
  z.object({
    type: z.literal('delayedFlightsTable'),
    from: z.string(),
    to: z.string(),
    maxRows: positiveInt
      .optional()
      .describe('Maximum number of flight rows to display. Defaults to 30.'),
  }),
  z.object({
    type: z.literal('delayShareChart'),
    from: z.string(),
    to: z.string(),
    chartType: z.enum(['pie', 'bar']).optional().describe('Defaults to "pie".'),
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
      .optional()
      .describe('Number of upcoming booked flights to show. Defaults to 2.'),
  }),
  z.object({
    type: z.literal('bookedFlightsList'),
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
  }),
  z.object({
    type: z.literal('flightSearch'),
    defaultFrom: z.string().optional().describe('Defaults to "Graz".'),
    defaultTo: z.string().optional().describe('Defaults to "Hamburg".'),
  }),
  z.object({
    type: z.literal('rentalCars'),
    city: z
      .string()
      .optional()
      .describe(
        'Defaults to the destination of the next booked flight, otherwise "Hamburg".',
      ),
    maxItems: positiveInt
      .optional()
      .describe('Maximum number of cars to list. Defaults to no limit.'),
  }),
  z.object({
    type: z.literal('hotels'),
    city: z.string().optional(),
    maxItems: positiveInt
      .optional()
      .describe('Maximum number of hotels to list. Defaults to no limit.'),
  }),
  z.object({
    type: z.literal('weatherList'),
    maxRows: positiveInt
      .optional()
      .describe(
        'Maximum number of destination forecasts to list. Defaults to no limit.',
      ),
  }),
]);

export const dashboardSpecSchema = z.object({
  tiles: z.array(dashboardTileSchema).min(1),
});

export type DashboardTile = z.infer<typeof dashboardTileSchema>;
export type DashboardSpec = z.infer<typeof dashboardSpecSchema>;
