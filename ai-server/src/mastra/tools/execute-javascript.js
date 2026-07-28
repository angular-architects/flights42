import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { runSandbox } from '../utils/sandbox.js';
import { fetchFlights } from './search-flights.js';
const dataItemSchema = z.object({
  name: z.string(),
  value: z.number(),
});
const dataItemsSchema = z.array(dataItemSchema);
export const executeJavaScriptTool = createTool({
  id: 'executeJavaScript',
  description: `
    Runs a snippet of JavaScript inside a hardened QuickJS sandbox to aggregate flight data into
    chart-ready \`{ name, value }\` pairs.

    The snippet is executed AS AN ES MODULE, so top-level \`await\` is supported. There is NO
    wrapping function — write straight-line statements; do NOT use \`return\`.

    TWO host functions are exposed:

      \`await loadFlights(from: string, to: string): Promise<Flight[]>\`
      \`submitResult(items: { name: string, value: number }[]): void\`

    where \`from\`/\`to\` are city names with the first letter uppercase (e.g. "Graz", "Hamburg")
    and each \`Flight\` has the shape \`{ id: number, from: string, to: string, date: string,
    delay: number }\` (date is ISO, delay is minutes).

    Workflow inside the snippet:
      1. Call \`await loadFlights(from, to)\` once for every connection the request needs.
      2. Aggregate the loaded arrays into the chart-ready \`{ name, value }[]\` shape.
      3. Call \`submitResult(items)\` EXACTLY ONCE with that array. The sandbox treats this as the
         final result.

    The sandbox has NO other host APIs: no \`fetch\`, no \`import\`, no \`require\`, no \`process\`,
    no \`console\`, no network beyond \`loadFlights\`. \`import\`/\`export\` statements are
    rejected. It is killed after 30 s wall-clock time and is hard-capped at 64 MB memory and
    1 MB stack.

    The tool returns \`{ data, code, title }\`; the caller is expected to forward \`data\` and
    \`title\` to the client \`renderChart\` tool.
  `,
  inputSchema: z.object({
    code: z.string().describe(`
          Module body. Use \`await loadFlights(from, to)\` to load flights for each connection,
          aggregate into \`{ name, value }[]\`, then call \`submitResult(items)\` exactly once.
        `),
    title: z.string().describe('Human-readable chart title.'),
  }),
  outputSchema: z.object({
    data: dataItemsSchema,
    code: z.string(),
    title: z.string(),
  }),
  execute: async ({ code, title }) => {
    let captured = [];
    await runSandbox(code, {
      functions: {
        loadFlights: (from, to) => {
          return fetchFlights(from, to);
        },
        submitResult: (items) => {
          captured = items;
        },
      },
    });
    return { data: captured, code, title };
  },
});
