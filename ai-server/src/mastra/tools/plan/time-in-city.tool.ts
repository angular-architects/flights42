import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { canonicalCity } from '../city-aliases.js';
import { searchFlights } from '../search-flights.js';
import type { PlanFlight } from './plan-schemas.js';
import { commitPlan, type PlanToolContext, readPlan } from './plan-store.js';

type Goal = 'maximize' | 'minimize';

const inputSchema = z.object({
  city: z.string().describe('City of the plan, e.g. "Rome".'),
});

export const maximizeTimeTool = createTool({
  id: 'maximizeTime',
  description: `
    Maximizes the time in a city of the current travel plan and commits the plan:
    takes the earliest flight into the city and the latest flight out of it, each on
    its current day. Use it for "maximize my time in Rome", "mehr Zeit in Paris".
  `,
  inputSchema,
  execute: ({ city }, context) => adjustTimeInCity(city, 'maximize', context),
});

export const minimizeTimeTool = createTool({
  id: 'minimizeTime',
  description: `
    Minimizes the time in a city of the current travel plan and commits the plan:
    takes the latest flight into the city and the earliest flight out of it, each on
    its current day. Use it for "minimize my time in Paris", "kürzer in Rom".
  `,
  inputSchema,
  execute: ({ city }, context) => adjustTimeInCity(city, 'minimize', context),
});

async function adjustTimeInCity(
  city: string,
  goal: Goal,
  context: PlanToolContext,
): Promise<{ result: string }> {
  const plan = await readPlan(context);
  const target = canonicalCity(city).toLowerCase();
  const arrival = plan.flights.findIndex(
    (flight) => canonicalCity(flight.to).toLowerCase() === target,
  );
  const departure = plan.flights.findIndex(
    (flight, index) =>
      index > arrival && canonicalCity(flight.from).toLowerCase() === target,
  );

  if (arrival === -1 && departure === -1) {
    const cities = plan.flights.map((flight) => flight.to).join(', ');
    return {
      result: `The plan was not changed: no flight goes to or from ${city}. Cities in the plan: ${cities}.`,
    };
  }

  const flights = [...plan.flights];
  if (arrival !== -1) {
    flights[arrival] = await pick(
      flights[arrival],
      goal === 'maximize' ? 'earliest' : 'latest',
    );
  }
  if (departure !== -1) {
    flights[departure] = await pick(
      flights[departure],
      goal === 'maximize' ? 'latest' : 'earliest',
    );
  }

  const changed = flights.filter(
    (flight, index) => flight.id !== plan.flights[index].id,
  );
  if (changed.length === 0) {
    return {
      result: `The plan was not changed: it already ${goal}s the time in ${city}.`,
    };
  }

  await commitPlan(context, { ...plan, flights });
  const ids = changed.map((flight) => flight.id).join(', ');
  return {
    result: `The plan now ${goal}s the time in ${city}. New flights: ${ids}.`,
  };
}

async function pick(
  flight: PlanFlight,
  which: 'earliest' | 'latest',
): Promise<PlanFlight> {
  const candidates = (
    await searchFlights(flight.from, flight.to, flight.date)
  ).sort((a, b) => a.date.localeCompare(b.date));
  return (which === 'earliest' ? candidates[0] : candidates.at(-1)) ?? flight;
}
