import { createTool } from '@mastra/core/tools';
import jsonata from 'jsonata';
import { z } from 'zod';

export const aggregateDataTool = createTool({
  id: 'aggregateData',
  description: [
    'Aggregates, filters or transforms a data structure with a JSONata expression.',
    'See https://docs.jsonata.org/overview.html for the expression language.',
    '',
    'Typical use cases on flight arrays:',
    '- Group + count delayed vs. on-time:',
    '    `{ "delayed": $count(data[delay > 0]), "onTime": $count(data[delay = 0]) }`',
    '- Per-day delay percentage (data is an array of flights):',
    '    `data{$substring(date, 0, 10): $count($[delay > 0]) / $count($) * 100}`',
    '',
    'Pass the array under the variable name `data`. The expression is run against `{ data }`.',
  ].join('\n'),
  inputSchema: z.object({
    data: z
      .unknown()
      .describe(
        'JSON value the JSONata expression operates on, exposed as the variable `data` (e.g. an array of flights).',
      ),
    expression: z
      .string()
      .describe(
        'JSONata expression. Reference the input via `data` (e.g. `$count(data)`).',
      ),
  }),
  execute: async ({ data, expression }) => {
    try {
      const compiled = jsonata(expression);
      const result = await compiled.evaluate({ data });
      return { ok: true as const, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false as const, error: message };
    }
  },
});
