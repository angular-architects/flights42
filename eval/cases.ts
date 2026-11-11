import { TestBed } from '@angular/core/testing';
import { injectAgentStore } from '@copilotkit/angular';

import { PlanStore } from '../src/app/domains/ticketing/ai/plan/plan-store';
import { injectPlanningAgentStore } from '../src/app/domains/ticketing/ai/planning-agent-store';
import { injectTicketingAgentStore } from '../src/app/domains/ticketing/ai/ticketing-agent-store';
import { examplePrompts as reportingPrompts } from '../src/app/domains/ticketing/feature-reporting/reporting-page/example-prompts';
import { injectReportingAgentStore } from '../src/app/domains/ticketing/feature-reporting/reporting-page/reporting-agent-store';
import { selectChart } from '../src/app/domains/ticketing/feature-reporting/reporting-page/reporting-chart';
import type { TravelPlan } from '../src/app/domains/ticketing/feature-travel-planner/travel-plan-model';
import { TravelPlanStore } from '../src/app/domains/ticketing/feature-travel-planner/travel-plan-store';
import { TravelPlannerPage } from '../src/app/domains/ticketing/feature-travel-planner/travel-planner-page';
import { TravelPlannerRequestStore } from '../src/app/domains/ticketing/feature-travel-planner/travel-planner-request-store';
import { TRAVEL_REFINEMENT_AGENT_ID } from '../src/app/domains/ticketing/feature-travel-planner/travel-refinement-agent-store';
import { TravelRefinementChatService } from '../src/app/domains/ticketing/feature-travel-planner/travel-refinement-chat-service';
import { injectDashboardAgentStore } from '../src/app/shell/dashboard/dashboard-agent-store';
import { examplePrompts as dashboardPrompts } from '../src/app/shell/dashboard/example-prompts';
import {
  captureTurn,
  inContext,
  isRecord,
  renderedToolNames,
  runTurn,
  type Turn,
  waitUntil,
} from './harness';
import {
  addDays,
  type Flight,
  hotelFor,
  isoDay,
  loadFlight,
  loadFlights,
  localDay,
} from './reference';

export interface TurnResult {
  name: string;
  turn?: Turn;
  failures: string[];
}

export interface EvalCase {
  name: string;
  run: () => Promise<TurnResult[]>;
}

const PREFERENCES = 'Stopover in Paris for Dinner';

const START_DAY_OFFSET = 10;

export const cases: EvalCase[] = [
  { name: 'ticketing', run: runTicketing },
  { name: 'planning', run: runPlanning },
  {
    name: 'dashboard-analytics',
    run: () => runDashboard('dashboard-analytics', 0, checkAnalyticsTiles),
  },
  {
    name: 'dashboard-personal',
    run: () => runDashboard('dashboard-personal', 1, checkPersonalTiles),
  },
  {
    name: 'reporting-per-day',
    run: () => runReporting('reporting-per-day', 0, checkDelayPerDay),
  },
  {
    name: 'reporting-counts',
    run: () => runReporting('reporting-counts', 1, checkDelayCounts),
  },
  { name: 'travel-planner', run: runTravelPlanner },
  {
    name: 'refinement-better-hotel',
    run: () =>
      runRefinement('Gib mir ein besseres Hotel in Paris', checkBetterHotel),
  },
  {
    name: 'refinement-maximize-rome',
    run: () => runRefinement('Maximiere meine Zeit in Rom', checkMaximizeRome),
  },
  {
    name: 'refinement-end-in-vienna',
    run: () =>
      runRefinement(
        'Anstatt in Graz will ich meine Reise in Wien beenden',
        checkEndInVienna,
      ),
  },
  {
    name: 'refinement-no-hotel-rome',
    run: () =>
      runRefinement('Ich brauche doch kein Hotel in Rom', checkNoHotelInRome),
  },
];

async function runTicketing(): Promise<TurnResult[]> {
  const store = inContext(() => injectTicketingAgentStore());
  const paris = await loadFlight(516);
  const results: TurnResult[] = [];

  const ask = async (prompt: string, check: (turn: Turn) => string[]) => {
    const turn = await runTurn(store, prompt);
    results.push({
      name: `ticketing: ${prompt}`,
      turn,
      failures: [...turnErrors(turn), ...check(turn)],
    });
  };

  await ask('Habe ich schon Paris gebucht?', (turn) => [
    ...expectShownFlights(turn, paris ? [paris] : []),
    ...expectAnswer(turn),
  ]);
  await ask('Habe ich schon Amsterdam gebucht?', (turn) => [
    ...expectShownFlights(turn, []),
    ...expectAnswer(turn),
  ]);
  await ask('Suche Graz -> Madrid', (turn) =>
    expectFlightSearch(turn, 'Graz', 'Madrid'),
  );
  await ask('Und retour', (turn) => expectFlightSearch(turn, 'Madrid', 'Graz'));
  await ask('Suche nochmals Graz -> Madrid', (turn) =>
    expectFlightSearch(turn, 'Graz', 'Madrid'),
  );
  await ask('Wann geht mein Flug nach Paris?', (turn) =>
    expectAnswerMentions(turn, paris ? dayVariants(isoDay(paris.date)) : []),
  );
  return results;
}

async function runPlanning(): Promise<TurnResult[]> {
  const store = inContext(() => injectPlanningAgentStore());
  const planStore = TestBed.inject(PlanStore);
  const steps = () =>
    planStore.steps().map((step) => `${step.action} ${step.flightId ?? '-'}`);
  const results: TurnResult[] = [];

  const ask = async (
    prompt: string,
    expected: (previous: string[]) => string[],
    unordered = false,
  ) => {
    const previous = steps();
    const turn = await runTurn(store, prompt);
    const actual = steps();
    const want = expected(previous);
    const same = unordered
      ? [...actual].sort().join() === [...want].sort().join()
      : actual.join() === want.join();
    results.push({
      name: `planning: ${prompt}`,
      turn,
      failures: [
        ...turnErrors(turn),
        ...(same
          ? []
          : [`plan is [${actual.join(', ')}], expected [${want.join(', ')}]`]),
        ...(calls(turn, 'planWidget').length > 0 ? [] : ['no planWidget']),
      ],
    });
  };

  await ask('Verschiebe 1 auf 5', () => ['cancel 1', 'book 5'], true);
  await ask('Ergänze auch die Buchung von 6', (previous) => [
    ...previous,
    'book 6',
  ]);
  await ask('Drehe die Reihenfolge der Schritte im Plan um', (previous) =>
    [...previous].reverse(),
  );
  await ask('Füge oben eine Buchung für 7 ein', (previous) => [
    'book 7',
    ...previous,
  ]);
  return results;
}

async function runDashboard(
  name: string,
  index: number,
  check: (tiles: Record<string, unknown>[]) => string[],
): Promise<TurnResult[]> {
  const store = inContext(() => injectDashboardAgentStore());
  const turn = await runTurn(store, dashboardPrompts[index], {
    preventCaching: true,
  });
  const express = calls(turn, 'renderDashboard').at(-1)?.args['express'];
  const tiles = typeof express === 'string' ? toTiles(express) : undefined;
  return [
    {
      name,
      turn,
      failures: [
        ...turnErrors(turn),
        ...(tiles ? check(tiles) : ['no renderDashboard call']),
      ],
    },
  ];
}

const tileParams: Record<string, string[]> = {
  FlightsTable: ['from', 'to', 'maxRows'],
  DelayedFlightsTable: ['from', 'to', 'maxRows'],
  DelayShareChart: ['from', 'to', 'chartType'],
  DelaysPerDayChart: ['from', 'to'],
  BoardingPasses: ['count'],
  BookedFlightsList: ['showCheckInButton', 'showWeather', 'maxRows'],
  FlightSearch: ['defaultFrom', 'defaultTo'],
  RentalCars: ['city', 'maxItems'],
  Hotels: ['city', 'maxItems'],
  WeatherList: ['maxRows'],
};

function toTiles(express: string): Record<string, unknown>[] {
  const matches = [...express.matchAll(/(\w+)\(([^()]*)\)/g)];
  const tileMatches = matches.filter((match) => {
    return Object.hasOwn(tileParams, match[1]);
  });
  return tileMatches.map((match) => {
    return toTile(match[1], match[2]);
  });
}

function toTile(component: string, argList: string): Record<string, unknown> {
  const tile: Record<string, unknown> = { component };
  const args = argList
    .split(',')
    .map((arg) => {
      return arg.trim();
    })
    .filter((arg) => {
      return arg !== '';
    });
  args.forEach((arg, index) => {
    const named = /^(\w+)\s*=\s*(.+)$/.exec(arg);
    if (named) {
      tile[named[1]] = toValue(named[2]);
    } else {
      tile[tileParams[component][index]] = toValue(arg);
    }
  });
  return tile;
}

function toValue(literal: string): unknown {
  try {
    return JSON.parse(literal);
  } catch {
    return literal;
  }
}

function checkAnalyticsTiles(tiles: Record<string, unknown>[]): string[] {
  const types = [
    'FlightsTable',
    'DelayedFlightsTable',
    'DelaysPerDayChart',
    'DelayShareChart',
  ];
  const expected = [
    ...types.map((type) => `${type} graz-hamburg`),
    ...types.map((type) => `${type} hamburg-graz`),
  ];
  const actual = tiles.map(
    (tile) =>
      `${tile['component']} ${String(tile['from']).toLowerCase()}-${String(tile['to']).toLowerCase()}`,
  );
  const failures = sameItems(actual, expected, 'tiles');
  const pie = tiles.filter(
    (tile) =>
      tile['component'] === 'DelayShareChart' && tile['chartType'] === 'bar',
  );
  return pie.length > 0
    ? [...failures, 'delayShareChart rendered as bar instead of pie']
    : failures;
}

function checkPersonalTiles(tiles: Record<string, unknown>[]): string[] {
  const expected = [
    'BoardingPasses',
    'BookedFlightsList',
    'FlightSearch',
    'RentalCars',
    'Hotels',
    'WeatherList',
  ];
  const failures = sameItems(
    tiles.map((tile) => String(tile['component'])),
    expected,
    'tiles',
  );
  const byType = (type: string) =>
    tiles.find((tile) => tile['component'] === type);
  const count = byType('BoardingPasses')?.['count'];
  if (count !== undefined && count !== null && Number(count) !== 2) {
    failures.push(`boardingPasses count ${count}, expected 2`);
  }
  if (String(byType('BookedFlightsList')?.['showCheckInButton']) === 'false') {
    failures.push('bookedFlightsList without check-in button');
  }
  const search = byType('FlightSearch');
  const from = search?.['defaultFrom'] ?? 'Graz';
  const to = search?.['defaultTo'] ?? 'Hamburg';
  if (search && (from !== 'Graz' || to !== 'Hamburg')) {
    failures.push(`flightSearch defaults ${from}/${to}`);
  }
  return failures;
}

async function runReporting(
  name: string,
  index: number,
  check: (data: { name: string; value: number }[]) => Promise<string[]>,
): Promise<TurnResult[]> {
  const store = inContext(() => injectReportingAgentStore());
  const turn = await runTurn(store, reportingPrompts[index]);
  const data = selectChart(store().messages())?.data ?? [];
  return [
    {
      name,
      turn,
      failures: [
        ...turnErrors(turn),
        ...(data.length > 0 ? await check(data) : ['no chart rendered']),
      ],
    },
  ];
}

async function checkDelayPerDay(
  data: { name: string; value: number }[],
): Promise<string[]> {
  const routes = [
    ['Graz', 'Hamburg'],
    ['Graz', 'London'],
    ['Graz', 'New York'],
  ];
  const flights = (
    await Promise.all(
      routes.flatMap(([a, b]) => [loadFlights(a, b), loadFlights(b, a)]),
    )
  ).flat();
  const days = [
    ...new Set(flights.map((flight) => isoDay(flight.date))),
  ].sort();
  const reference = days.map((day) => {
    const onDay = flights.filter((flight) => isoDay(flight.date) === day);
    const delayed = onDay.filter((flight) => flight.delay > 0).length;
    return { day, value: (delayed / onDay.length) * 100 };
  });

  const failures: string[] = [];
  if (data.length !== reference.length) {
    failures.push(`${data.length} bars, expected ${reference.length}`);
  }
  const matchedDays = data.map((item) => matchDay(item.name, days));
  if (matchedDays.join() !== [...matchedDays].sort().join()) {
    failures.push('not sorted by date');
  }
  for (const ref of reference) {
    const index = matchedDays.indexOf(ref.day);
    if (index === -1) {
      failures.push(`no bar for ${ref.day}`);
      continue;
    }
    if (!closeTo(data[index].value, ref.value, 0.5)) {
      failures.push(
        `${ref.day}: ${data[index].value}, expected ${ref.value.toFixed(1)}`,
      );
    }
  }
  return failures;
}

async function checkDelayCounts(
  data: { name: string; value: number }[],
): Promise<string[]> {
  const routes = [
    ['Graz', 'Hamburg'],
    ['Hamburg', 'Graz'],
    ['Graz', 'New York'],
    ['New York', 'Graz'],
  ];
  const reference: number[] = [];
  for (const [from, to] of routes) {
    const flights = await loadFlights(from, to);
    const delayed = flights.filter((flight) => flight.delay > 0).length;
    reference.push(delayed, flights.length - delayed);
  }
  const actual = data.map((item) => (item.value === 0.1 ? 0 : item.value));
  return sameItems(
    actual.map(String),
    reference.map(String),
    'values (delayed and on-time counts)',
  );
}

async function runTravelPlanner(): Promise<TurnResult[]> {
  TestBed.inject(TravelPlannerRequestStore).setRequest({
    from: 'Graz',
    to: 'Rome',
    duration: 3,
    preferences: PREFERENCES,
  });
  const planStore = TestBed.inject(TravelPlanStore);
  const fixture = TestBed.createComponent(TravelPlannerPage);
  fixture.autoDetectChanges();
  const page = fixture.componentInstance;
  const store = page['chat'];

  const turn = await captureTurn(store, 'Graz -> Rome, 3 days', async () => {
    page['submit']();
    await waitUntil(() => store().isRunning(), 5_000);
    await waitUntil(() => !store().isRunning(), 600_000);
    await waitUntil(() => planStore.flights().length > 0, 2_000);
  });

  const day = localDay(START_DAY_OFFSET);
  const plan = planStore.plan();
  const failures = [
    ...turnErrors(turn),
    ...(await expectFlights(plan, [
      ['Graz', 'Paris', day],
      ['Paris', 'Rome', addDays(day, 1)],
      ['Rome', 'Graz', addDays(day, 2)],
    ])),
    ...expectHotels(plan, ['Paris', 'Rome']),
  ];
  fixture.destroy();
  return [{ name: 'travel-planner', turn, failures }];
}

async function runRefinement(
  prompt: string,
  check: (plan: TravelPlan, base: TravelPlan) => Promise<string[]>,
): Promise<TurnResult[]> {
  const name = `refinement: ${prompt}`;
  const base = await basePlan();
  if (!base) {
    return [{ name, failures: ['no reference flights for the base plan'] }];
  }

  TestBed.inject(TravelPlannerRequestStore).setRequest({
    from: 'Graz',
    to: 'Rome',
    duration: 3,
    preferences: PREFERENCES,
  });
  const chat = TestBed.inject(TravelRefinementChatService);
  chat.init();
  chat.reset();
  const planStore = TestBed.inject(TravelPlanStore);
  planStore.setPlan(base);
  const store = inContext(() => injectAgentStore(TRAVEL_REFINEMENT_AGENT_ID));

  const turn = await runTurn(store, prompt);
  const plan = planStore.plan();
  return [
    {
      name,
      turn,
      failures: [
        ...turnErrors(turn),
        ...expectAnswer(turn),
        ...(await check(plan, base)),
      ],
    },
  ];
}

async function basePlan(): Promise<TravelPlan | undefined> {
  const day = localDay(START_DAY_OFFSET);
  const outbound = await pickFlight('Graz', 'Paris', day, 'latest');
  const onward = await pickFlight('Paris', 'Rome', addDays(day, 1), 'latest');
  const back = await pickFlight('Rome', 'Graz', addDays(day, 2), 'earliest');
  if (!outbound || !onward || !back) {
    return undefined;
  }
  return {
    summary: 'Graz → Paris (dinner stopover) → Rome → Graz',
    flights: [outbound, onward, back],
    hotels: [hotelFor('Paris', 4), hotelFor('Rome', 4)],
  };
}

async function pickFlight(
  from: string,
  to: string,
  day: string,
  which: 'earliest' | 'latest',
): Promise<Flight | undefined> {
  const flights = (await loadFlights(from, to))
    .filter((flight) => isoDay(flight.date) === day)
    .sort((a, b) => a.date.localeCompare(b.date));
  return which === 'earliest' ? flights[0] : flights.at(-1);
}

async function checkBetterHotel(
  plan: TravelPlan,
  base: TravelPlan,
): Promise<string[]> {
  return [
    ...expectSameFlights(plan, base),
    ...expectHotelList(plan, [hotelFor('Paris', 5), base.hotels[1]]),
  ];
}

async function checkMaximizeRome(
  plan: TravelPlan,
  base: TravelPlan,
): Promise<string[]> {
  const [, onward, back] = base.flights;
  const earliest = await pickFlight(
    'Paris',
    'Rome',
    isoDay(onward.date),
    'earliest',
  );
  const latest = await pickFlight('Rome', 'Graz', isoDay(back.date), 'latest');
  return [
    ...expectFlightIds(plan, [base.flights[0].id, earliest?.id, latest?.id]),
    ...(await expectValidFlights(plan)),
    ...expectHotelList(plan, base.hotels),
  ];
}

async function checkEndInVienna(
  plan: TravelPlan,
  base: TravelPlan,
): Promise<string[]> {
  const [outbound, onward, back] = base.flights;
  const failures = [
    ...(await expectFlights(plan, [
      ['Graz', 'Paris', isoDay(outbound.date)],
      ['Paris', 'Rome', isoDay(onward.date)],
      ['Rome', 'Wien', isoDay(back.date)],
    ])),
  ];
  if (
    plan.flights[0]?.id !== outbound.id ||
    plan.flights[1]?.id !== onward.id
  ) {
    failures.push('outbound or onward flight changed');
  }
  const kept = base.hotels.every((hotel) =>
    plan.hotels.some((actual) => sameHotel(actual, hotel)),
  );
  if (!kept) {
    failures.push(`hotels changed: ${hotelNames(plan)}`);
  }
  return failures;
}

async function checkNoHotelInRome(
  plan: TravelPlan,
  base: TravelPlan,
): Promise<string[]> {
  return [
    ...expectSameFlights(plan, base),
    ...expectHotelList(plan, [base.hotels[0]]),
  ];
}

function expectShownFlights(turn: Turn, expected: Flight[]): string[] {
  const rendered = renderedToolNames();
  const shown: unknown[] = [];
  for (const call of turn.toolCalls) {
    if (call.name === 'flightWidget') {
      shown.push(call.args['flight']);
    } else if (rendered.has(call.name) && isRecord(call.result)) {
      const flights = call.result['flights'];
      shown.push(...(Array.isArray(flights) ? flights : []));
    }
  }
  const ids = shown.map((flight) => (isRecord(flight) ? flight['id'] : '?'));
  const failures = sameItems(
    ids.map(String),
    expected.map((flight) => String(flight.id)),
    'shown flights',
  );
  for (const flight of shown) {
    const reference = expected.find(
      (candidate) => isRecord(flight) && candidate.id === flight['id'],
    );
    if (reference && !sameFlight(flight, reference)) {
      failures.push(`flight ${reference.id} shown with wrong data`);
    }
  }
  return failures;
}

function expectFlightSearch(turn: Turn, from: string, to: string): string[] {
  const searches = calls(turn, 'findFlights');
  const match = searches.some(
    (call) =>
      String(call.args['from']).toLowerCase() === from.toLowerCase() &&
      String(call.args['to']).toLowerCase() === to.toLowerCase(),
  );
  const failures = [...turnErrors(turn)];
  if (!match) {
    const actual = searches
      .map((call) => `${call.args['from']}->${call.args['to']}`)
      .join(', ');
    failures.push(`no findFlights ${from}->${to} (got: ${actual || 'none'})`);
  }
  if (calls(turn, 'flightWidget').length > 0) {
    failures.push('search results rendered as flightWidgets');
  }
  return failures;
}

function expectAnswerMentions(turn: Turn, variants: string[]): string[] {
  const answer = answerText(turn);
  return variants.some((variant) => answer.includes(variant))
    ? []
    : [`answer does not mention ${variants[0]}: ${answer.slice(0, 80)}`];
}

function dayVariants(day: string): string[] {
  const [year, month, date] = day.split('-');
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli'];
  const later = ['August', 'September', 'Oktober', 'November', 'Dezember'];
  const name = [...months, ...later][Number(month) - 1];
  return [
    day,
    `${Number(date)}.${Number(month)}.`,
    `${date}.${month}.`,
    `${Number(date)}. ${name}`,
    `${date}.${month}.${year}`,
  ];
}

function answerText(turn: Turn): string {
  return [
    ...calls(turn, 'messageWidget').map((call) => String(call.args['text'])),
    turn.text,
  ].join(' ');
}

function expectAnswer(turn: Turn): string[] {
  return answerText(turn).trim() ? [] : ['no answer text'];
}

async function expectFlights(
  plan: TravelPlan,
  legs: [string, string, string][],
): Promise<string[]> {
  const actual = plan.flights.map(
    (flight) =>
      `${canonical(flight.from)}->${canonical(flight.to)} ${isoDay(flight.date)}`,
  );
  const expected = legs.map(
    ([from, to, day]) => `${canonical(from)}->${canonical(to)} ${day}`,
  );
  return [
    ...(actual.join() === expected.join()
      ? []
      : [`flights [${actual.join(', ')}], expected [${expected.join(', ')}]`]),
    ...(await expectValidFlights(plan)),
  ];
}

async function expectValidFlights(plan: TravelPlan): Promise<string[]> {
  const failures: string[] = [];
  for (const flight of plan.flights) {
    const reference = await loadFlight(flight.id);
    if (!reference || !sameFlight(flight, reference)) {
      failures.push(`flight ${flight.id} has data that differs from the API`);
    }
  }
  return failures;
}

function expectFlightIds(
  plan: TravelPlan,
  ids: (number | undefined)[],
): string[] {
  const actual = plan.flights.map((flight) => flight.id);
  return actual.join() === ids.join()
    ? []
    : [`flight ids [${actual.join(', ')}], expected [${ids.join(', ')}]`];
}

function expectSameFlights(plan: TravelPlan, base: TravelPlan): string[] {
  return expectFlightIds(
    plan,
    base.flights.map((flight) => flight.id),
  );
}

function expectHotels(plan: TravelPlan, cities: string[]): string[] {
  const failures = sameItems(
    plan.hotels.map((hotel) => canonical(hotel.city)),
    cities.map(canonical),
    'hotel cities',
  );
  for (const hotel of plan.hotels) {
    if (!sameHotel(hotel, hotelFor(hotel.city, hotel.stars))) {
      failures.push(`hotel ${hotel.name} has invented data`);
    }
  }
  return failures;
}

function expectHotelList(plan: TravelPlan, expected: TravelPlan['hotels']) {
  const same =
    plan.hotels.length === expected.length &&
    expected.every((hotel) =>
      plan.hotels.some((actual) => sameHotel(actual, hotel)),
    );
  return same
    ? []
    : [
        `hotels [${hotelNames(plan)}], expected [${expected.map((hotel) => hotel.name).join(', ')}]`,
      ];
}

function hotelNames(plan: TravelPlan): string {
  return plan.hotels.map((hotel) => hotel.name).join(', ');
}

function sameHotel(
  actual: TravelPlan['hotels'][number],
  expected: TravelPlan['hotels'][number] | undefined,
): boolean {
  return (
    !!expected &&
    actual.id === expected.id &&
    actual.name === expected.name &&
    actual.stars === expected.stars &&
    actual.imageUrl === expected.imageUrl &&
    canonical(actual.city) === canonical(expected.city)
  );
}

function sameFlight(actual: unknown, expected: Flight): boolean {
  return (
    isRecord(actual) &&
    actual['id'] === expected.id &&
    canonical(String(actual['from'])) === canonical(expected.from) &&
    canonical(String(actual['to'])) === canonical(expected.to) &&
    actual['date'] === expected.date &&
    actual['delay'] === expected.delay
  );
}

function canonical(city: string): string {
  const lower = city.trim().toLowerCase();
  const aliases: Record<string, string> = { rom: 'rome', vienna: 'wien' };
  return aliases[lower] ?? lower;
}

function matchDay(name: string, days: string[]): string {
  const iso = /\d{4}-\d{2}-\d{2}/.exec(name)?.[0];
  if (iso) {
    return iso;
  }
  return (
    days.find((day) => {
      const [, month, date] = day.split('-');
      return (
        name.includes(`${month}-${date}`) ||
        name.includes(`${date}.${month}`) ||
        name.includes(`${Number(date)}.${Number(month)}`)
      );
    }) ?? name
  );
}

function closeTo(actual: number, expected: number, tolerance: number): boolean {
  if (expected === 0 && actual === 0.1) {
    return true;
  }
  return Math.abs(actual - expected) <= tolerance;
}

function sameItems(actual: string[], expected: string[], label: string) {
  const a = [...actual].sort().join(', ');
  const e = [...expected].sort().join(', ');
  return a === e ? [] : [`${label} [${a}], expected [${e}]`];
}

function calls(turn: Turn, name: string) {
  return turn.toolCalls.filter((call) => call.name === name);
}

function turnErrors(turn: Turn): string[] {
  return turn.errors.map((error) => `run error: ${error}`);
}
