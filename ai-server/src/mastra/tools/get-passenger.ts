import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const PASSENGER_API = 'https://demo.angulararchitects.io/api/passenger';

interface RawPassenger {
  id: number;
  name: string;
  firstName: string;
  bonusMiles: number;
  passengerStatus: string;
}

/**
 * The real passenger API has no email field. For the PII-redaction demo we
 * synthesize a deterministic address from the name so there is an actual piece
 * of PII the output processor can mask later on.
 */
function synthEmail(firstName: string, name: string): string {
  return `${firstName}.${name}@example.com`.toLowerCase().replace(/\s+/g, '');
}

export const getPassengerTool = createTool({
  id: 'getPassenger',
  description:
    'Looks up a single passenger by their id and returns their profile, including an email address.',
  inputSchema: z.object({
    id: z.number().describe('The id of the passenger to look up.'),
  }),
  outputSchema: z.object({
    id: z.number(),
    name: z.string(),
    firstName: z.string(),
    bonusMiles: z.number(),
    passengerStatus: z.string(),
    email: z.string(),
  }),
  execute: async ({ id }) => {
    const response = await fetch(`${PASSENGER_API}?id=${id}`);
    if (!response.ok) {
      throw new Error(`Failed to load passenger ${id}: ${response.status}`);
    }

    const payload = (await response.json()) as RawPassenger | RawPassenger[];
    const passenger = Array.isArray(payload) ? payload[0] : payload;
    if (!passenger) {
      throw new Error(`Passenger ${id} not found.`);
    }

    return {
      id: passenger.id,
      name: passenger.name,
      firstName: passenger.firstName,
      bonusMiles: passenger.bonusMiles,
      passengerStatus: passenger.passengerStatus,
      email: synthEmail(passenger.firstName, passenger.name),
    };
  },
});
