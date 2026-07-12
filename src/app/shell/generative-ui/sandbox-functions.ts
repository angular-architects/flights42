import { type SandboxFunction } from '@copilotkit/angular';
import { z } from 'zod';

import { ConfigService } from '../../domains/shared/util-common/config-service';

const searchFlightsParamsSchema = z.object({
  from: z.string().describe('Departure city name, e.g. "Graz"'),
  to: z.string().describe('Destination city name, e.g. "Hamburg"'),
});

export type SearchFlightsParams = z.infer<typeof searchFlightsParamsSchema>;

interface FlightsResponse {
  flights?: unknown[];
}

export function createSandboxFunctions(
  config: ConfigService,
): SandboxFunction[] {
  return [
    {
      name: 'searchFlights',
      description:
        'Loads the flights between two cities. Use capitalised city names (e.g. "Graz"), never airport codes. Resolves to an array of flights { id, from, to, date, delay }.',
      parameters: searchFlightsParamsSchema,
      handler: async (args) => {
        const { from, to } = searchFlightsParamsSchema.parse(args);
        const params = new URLSearchParams({ from, to });
        return fetchFlights(`${config.aiServerUrl}/flights?${params}`);
      },
    },
    {
      name: 'findBookedFlights',
      description:
        'Loads the flights booked by the current passenger. Takes no parameters. Resolves to an array of flights { id, from, to, date, delay }.',
      parameters: z.object({}),
      handler: async () => {
        return fetchFlights(`${config.aiServerUrl}/bookings`);
      },
    },
  ];
}

async function fetchFlights(url: string): Promise<unknown[]> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  const payload = (await response.json()) as FlightsResponse;
  return payload.flights ?? [];
}
