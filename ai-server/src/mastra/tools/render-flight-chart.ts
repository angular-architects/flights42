import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { buildAndCacheChartUrl } from './render-chart.js';
import { fetchFlights, type FlightRecord } from './search-flights.js';

interface DelayShareStats {
  total: number;
  onTime: number;
  delayed: number;
}

interface DelaysPerDayStats {
  dates: { date: string; onTime: number; delayed: number }[];
}

function filterByDate(
  flights: FlightRecord[],
  date: string | undefined,
): FlightRecord[] {
  if (!date) {
    return flights;
  }
  return flights.filter((f) => f.date.startsWith(date));
}

function aggregateDelayShare(flights: FlightRecord[]): DelayShareStats {
  let onTime = 0;
  let delayed = 0;
  for (const f of flights) {
    if (f.delay > 0) {
      delayed += 1;
    } else {
      onTime += 1;
    }
  }
  return { total: flights.length, onTime, delayed };
}

function aggregateDelaysPerDay(flights: FlightRecord[]): DelaysPerDayStats {
  const buckets = new Map<string, { onTime: number; delayed: number }>();
  for (const f of flights) {
    const day = f.date.slice(0, 10);
    const bucket = buckets.get(day) ?? { onTime: 0, delayed: 0 };
    if (f.delay > 0) {
      bucket.delayed += 1;
    } else {
      bucket.onTime += 1;
    }
    buckets.set(day, bucket);
  }
  const dates = [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, { onTime, delayed }]) => ({ date, onTime, delayed }));
  return { dates };
}

export const renderFlightChartTool = createTool({
  id: 'renderFlightChart',
  description: [
    'One-shot helper for the standard delay-related chart tiles on the',
    'flight dashboard. Combines `searchFlightsTool` + aggregation +',
    '`renderChartTool` in a single call so the agent does not need three',
    'separate LLM round-trips per chart.',
    '',
    'Modes:',
    '- `delayShare`: counts on-time vs. delayed flights between the two cities',
    '  (optionally restricted to a single ISO date prefix). Best with',
    '  `chartType: "pie"` or `"bar"` — `labels` are `["On time", "Delayed"]`.',
    '- `delaysPerDay`: groups flights by date and counts on-time vs. delayed per',
    '  day. Best with `chartType: "bar"` (grouped bars per day).',
    '',
    'Returns `{ url, stats }`. Embed `url` verbatim in an A2UI `Image`',
    'component (typically via an `updateDataModel` path). `stats` mirrors',
    'the aggregation so the agent can also surface numbers next to the',
    'chart without another aggregation tool call.',
    '',
    'Use this tool for the typical "on-time vs. delayed" / "delays per day"',
    'tiles. For custom aggregations (other groupings, ratios, percentages),',
    'fall back to `aggregateDataTool` + `renderChartTool`.',
  ].join('\n'),
  inputSchema: z.object({
    from: z.string().describe('Departure city, e.g. "Graz".'),
    to: z.string().describe('Destination city, e.g. "Hamburg".'),
    type: z
      .enum(['delayShare', 'delaysPerDay'])
      .describe('Aggregation mode (see tool description).'),
    chartType: z.enum(['bar', 'pie']),
    date: z
      .string()
      .optional()
      .describe(
        'Optional ISO date prefix (YYYY-MM-DD) to restrict the data to one day.',
      ),
    title: z.string().optional().describe('Optional chart title.'),
  }),
  outputSchema: z.object({
    url: z.string(),
    stats: z.union([
      z.object({
        mode: z.literal('delayShare'),
        total: z.number(),
        onTime: z.number(),
        delayed: z.number(),
      }),
      z.object({
        mode: z.literal('delaysPerDay'),
        dates: z.array(
          z.object({
            date: z.string(),
            onTime: z.number(),
            delayed: z.number(),
          }),
        ),
      }),
    ]),
  }),
  execute: async ({ from, to, type, chartType, date, title }) => {
    const allFlights = await fetchFlights(from, to);
    const flights = filterByDate(allFlights, date);

    if (type === 'delayShare') {
      const share = aggregateDelayShare(flights);
      const url = buildAndCacheChartUrl({
        type: chartType,
        title,
        labels: ['On time', 'Delayed'],
        datasets: [{ label: 'Flights', data: [share.onTime, share.delayed] }],
      });
      return {
        url,
        stats: { mode: 'delayShare' as const, ...share },
      };
    }

    const perDay = aggregateDelaysPerDay(flights);
    const labels = perDay.dates.map((d) => d.date);
    const onTime = perDay.dates.map((d) => d.onTime);
    const delayed = perDay.dates.map((d) => d.delayed);
    const datasets =
      chartType === 'pie'
        ? [{ label: 'Delayed', data: delayed }]
        : [
            { label: 'On time', data: onTime },
            { label: 'Delayed', data: delayed },
          ];
    const url = buildAndCacheChartUrl({
      type: chartType,
      title,
      labels,
      datasets,
    });
    return {
      url,
      stats: { mode: 'delaysPerDay' as const, dates: perDay.dates },
    };
  },
});
