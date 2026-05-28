import { randomUUID } from 'node:crypto';

import type { A2uiMessage } from '@a2ui/web_core/v0_9';

import {
  type BookedFlight,
  getBookedFlights,
} from '../data/booked-flights-store.js';
import { buildAndCacheChartUrl } from '../tools/render-chart.js';
import { searchHotels } from '../tools/search-hotels.js';
import { searchRentalCars } from '../tools/search-rental-cars.js';
import { fetchFlights, type FlightRecord } from '../tools/search-flights.js';
import { weatherForecast, weatherIconFor } from '../tools/weather-forecast.js';
import type { DashboardSpec, DashboardTile } from './dashboard-spec.js';

const A2UI_VERSION = 'v0.9' as const;
const BASIC_CATALOG_ID =
  'https://a2ui.org/specification/v0_9/basic_catalog.json';
// Default cap on rows we render per flight table tile when the spec
// doesn't override it. Protects us from runaway DOM trees if the
// upstream data grows. Tile types that previously had no cap stay
// uncapped by default; the DSL exposes `maxRows`/`maxItems` for
// per-tile overrides.
const DEFAULT_FLIGHT_TABLE_MAX_ROWS = 30;
const FALLBACK_CITY = 'Hamburg';

type Component = Record<string, unknown> & {
  id: string;
  component: string;
};

/**
 * Record of a single data-fetch step the compiler ran while assembling
 * the dashboard. The route surfaces these as synthetic AG-UI tool-call
 * events so the user keeps the same "tool calls" visibility they had
 * before the DSL refactor (where every call originated from the LLM).
 */
export interface DataStep {
  name: string;
  args: unknown;
  result?: unknown;
}

export interface CompiledDashboard {
  surfaceId: string;
  structural: A2uiMessage[];
  dataModel: A2uiMessage[];
  dataSteps: DataStep[];
}

interface DashboardData {
  bookedFlights: BookedFlight[];
  flightsByRoute: Map<string, FlightRecord[]>;
}

interface TileBuildResult {
  rootChildren: string[];
  components: Component[];
  dataOps: A2uiMessage[];
}

/**
 * Deterministically compiles a dashboard spec into a complete A2UI v0.9
 * surface (`createSurface` + `updateComponents` + `updateDataModel`).
 *
 * All tile types map to a fixed component layout; the only data
 * influence on the structure is the row count of dynamic lists/tables
 * so the grid does not contain trailing empty rows.
 */
export async function compileDashboard(
  spec: DashboardSpec,
  options: { surfaceId?: string } = {},
): Promise<CompiledDashboard> {
  const dataSteps: DataStep[] = [];
  const data = await fetchAllDashboardData(spec, dataSteps);
  return assembleDashboard(spec, data, options.surfaceId, dataSteps);
}

async function fetchAllDashboardData(
  spec: DashboardSpec,
  dataSteps: DataStep[],
): Promise<DashboardData> {
  const routes = new Set<string>();
  let needsBookedFlights = false;

  for (const tile of spec.tiles) {
    if (
      tile.type === 'flightsTable' ||
      tile.type === 'delayedFlightsTable' ||
      tile.type === 'delayShareChart' ||
      tile.type === 'delaysPerDayChart'
    ) {
      routes.add(routeKey(tile.from, tile.to));
    }
    if (
      tile.type === 'boardingPasses' ||
      tile.type === 'bookedFlightsList' ||
      tile.type === 'weatherList'
    ) {
      needsBookedFlights = true;
    }
    if ((tile.type === 'rentalCars' || tile.type === 'hotels') && !tile.city) {
      needsBookedFlights = true;
    }
  }

  const routeList = [...routes];
  const flightStepIndices: number[] = [];
  for (const key of routeList) {
    const [from, to] = key.split('|');
    flightStepIndices.push(
      dataSteps.push({ name: 'searchFlights', args: { from, to } }) - 1,
    );
  }
  let findBookedStepIdx: number | null = null;
  if (needsBookedFlights) {
    findBookedStepIdx =
      dataSteps.push({ name: 'findBookedFlights', args: {} }) - 1;
  }

  const [bookedFlights, ...flightLists] = await Promise.all([
    needsBookedFlights ? getBookedFlights() : Promise.resolve([]),
    ...routeList.map((key) => {
      const [from, to] = key.split('|');
      return fetchFlights(from, to);
    }),
  ]);

  flightStepIndices.forEach((stepIdx, i) => {
    dataSteps[stepIdx].result = { count: flightLists[i]?.length ?? 0 };
  });
  if (findBookedStepIdx !== null) {
    dataSteps[findBookedStepIdx].result = { count: bookedFlights.length };
  }

  const flightsByRoute = new Map<string, FlightRecord[]>();
  routeList.forEach((key, idx) => {
    flightsByRoute.set(key, flightLists[idx] ?? []);
  });

  return { bookedFlights, flightsByRoute };
}

function assembleDashboard(
  spec: DashboardSpec,
  data: DashboardData,
  givenSurfaceId: string | undefined,
  dataSteps: DataStep[],
): CompiledDashboard {
  const surfaceId = givenSurfaceId ?? `dash-${randomUUID()}`;

  const allComponents: Component[] = [];
  const allDataOps: A2uiMessage[] = [];
  const rootChildren: string[] = [];

  spec.tiles.forEach((tile, idx) => {
    const result = buildTile(idx, tile, data, surfaceId, dataSteps);
    rootChildren.push(...result.rootChildren);
    allComponents.push(...result.components);
    allDataOps.push(...result.dataOps);
  });

  const root: Component = {
    id: 'root',
    component: 'Column',
    children: rootChildren,
  };
  const components = [root, ...allComponents];

  const structural: A2uiMessage[] = [
    {
      version: A2UI_VERSION,
      createSurface: { surfaceId, catalogId: BASIC_CATALOG_ID },
    } as unknown as A2uiMessage,
    {
      version: A2UI_VERSION,
      updateComponents: { surfaceId, components },
    } as unknown as A2uiMessage,
  ];

  return { surfaceId, structural, dataModel: allDataOps, dataSteps };
}

function buildTile(
  idx: number,
  tile: DashboardTile,
  data: DashboardData,
  surfaceId: string,
  dataSteps: DataStep[],
): TileBuildResult {
  switch (tile.type) {
    case 'flightsTable':
      return buildFlightsTable(idx, tile, data, surfaceId, false);
    case 'delayedFlightsTable':
      return buildFlightsTable(idx, tile, data, surfaceId, true);
    case 'delayShareChart':
      return buildDelayShareChart(idx, tile, data, surfaceId, dataSteps);
    case 'delaysPerDayChart':
      return buildDelaysPerDayChart(idx, tile, data, surfaceId, dataSteps);
    case 'boardingPasses':
      return buildBoardingPasses(idx, tile, data, surfaceId);
    case 'bookedFlightsList':
      return buildBookedFlightsList(idx, tile, data, surfaceId, dataSteps);
    case 'flightSearch':
      return buildFlightSearch(idx, tile, surfaceId);
    case 'rentalCars':
      return buildRentalCars(idx, tile, data, surfaceId, dataSteps);
    case 'hotels':
      return buildHotels(idx, tile, data, surfaceId, dataSteps);
    case 'weatherList':
      return buildWeatherList(idx, tile, data, surfaceId, dataSteps);
  }
}

function buildFlightsTable(
  idx: number,
  tile: Extract<
    DashboardTile,
    { type: 'flightsTable' | 'delayedFlightsTable' }
  >,
  data: DashboardData,
  surfaceId: string,
  onlyDelayed: boolean,
): TileBuildResult {
  const all = data.flightsByRoute.get(routeKey(tile.from, tile.to)) ?? [];
  const filtered = onlyDelayed ? all.filter((f) => f.delay > 0) : all;
  const limit = tile.maxRows ?? DEFAULT_FLIGHT_TABLE_MAX_ROWS;
  const flights = filtered.slice(0, limit);

  const cardId = tileId(idx, 'card');
  const bodyId = tileId(idx, 'body');
  const titleId = tileId(idx, 'title');
  const hdrId = tileId(idx, 'hdr');
  const lastColumnHeader = onlyDelayed ? 'Delay (min)' : 'Status';
  const headerCellIds = ['c0', 'c1', 'c2', 'c3'].map(
    (slot) => `${hdrId}-${slot}`,
  );

  const rowIds: string[] = [];
  const components: Component[] = [];
  const dataOps: A2uiMessage[] = [];

  if (flights.length === 0) {
    const emptyId = `${bodyId}-empty`;
    components.push(
      { id: cardId, component: 'Card', child: bodyId },
      {
        id: bodyId,
        component: 'Column',
        children: [titleId, emptyId],
      },
      {
        id: titleId,
        component: 'Text',
        text: titleFor(tile.from, tile.to, onlyDelayed),
        variant: 'h2',
      },
      {
        id: emptyId,
        component: 'Text',
        text: onlyDelayed
          ? 'No delayed flights for this route.'
          : 'No flights found for this route.',
        variant: 'body',
      },
    );
    return { rootChildren: [cardId], components, dataOps };
  }

  for (let j = 0; j < flights.length; j += 1) {
    const rowId = `${tileId(idx, 'r')}${j}`;
    rowIds.push(rowId);
    const cellIds = [0, 1, 2, 3].map((c) => `${rowId}-c${c}`);
    const f = flights[j];
    const datePart = f.date.slice(0, 10);
    const timePart = f.date.slice(11, 16);
    const status = onlyDelayed
      ? String(f.delay)
      : f.delay > 0
        ? `Delayed by ${f.delay} min`
        : 'On time';

    components.push(
      {
        id: rowId,
        component: 'Row',
        align: 'stretch',
        children: cellIds,
      },
      cellText(cellIds[0], pathFor(idx, `flights/${j}/number`)),
      cellText(cellIds[1], pathFor(idx, `flights/${j}/date`)),
      cellText(cellIds[2], pathFor(idx, `flights/${j}/time`)),
      cellText(cellIds[3], pathFor(idx, `flights/${j}/status`)),
    );

    dataOps.push(
      dataOp(surfaceId, pathFor(idx, `flights/${j}/number`), String(f.id)),
      dataOp(surfaceId, pathFor(idx, `flights/${j}/date`), datePart),
      dataOp(surfaceId, pathFor(idx, `flights/${j}/time`), timePart),
      dataOp(surfaceId, pathFor(idx, `flights/${j}/status`), status),
    );
  }

  components.unshift(
    { id: cardId, component: 'Card', child: bodyId },
    {
      id: bodyId,
      component: 'Column',
      children: [titleId, hdrId, ...rowIds],
    },
    {
      id: titleId,
      component: 'Text',
      text: titleFor(tile.from, tile.to, onlyDelayed),
      variant: 'h2',
    },
    {
      id: hdrId,
      component: 'Row',
      align: 'stretch',
      children: headerCellIds,
    },
    headerText(headerCellIds[0], 'Flight'),
    headerText(headerCellIds[1], 'Date'),
    headerText(headerCellIds[2], 'Time'),
    headerText(headerCellIds[3], lastColumnHeader),
  );

  return { rootChildren: [cardId], components, dataOps };
}

function buildDelayShareChart(
  idx: number,
  tile: Extract<DashboardTile, { type: 'delayShareChart' }>,
  data: DashboardData,
  surfaceId: string,
  dataSteps: DataStep[],
): TileBuildResult {
  const flights = data.flightsByRoute.get(routeKey(tile.from, tile.to)) ?? [];
  let onTime = 0;
  let delayed = 0;
  for (const f of flights) {
    if (f.delay > 0) delayed += 1;
    else onTime += 1;
  }
  const chartType = tile.chartType ?? 'pie';
  const url = buildAndCacheChartUrl({
    type: chartType,
    title: `On-time vs. delayed (${tile.from} → ${tile.to})`,
    labels: ['On time', 'Delayed'],
    datasets: [{ label: 'Flights', data: [onTime, delayed] }],
  });
  dataSteps.push({
    name: 'renderFlightChart',
    args: {
      from: tile.from,
      to: tile.to,
      type: 'delayShare',
      chartType,
    },
    result: { onTime, delayed, total: onTime + delayed, url },
  });
  return chartTile(
    idx,
    surfaceId,
    `Delay share ${tile.from} → ${tile.to}`,
    url,
  );
}

function buildDelaysPerDayChart(
  idx: number,
  tile: Extract<DashboardTile, { type: 'delaysPerDayChart' }>,
  data: DashboardData,
  surfaceId: string,
  dataSteps: DataStep[],
): TileBuildResult {
  const flights = data.flightsByRoute.get(routeKey(tile.from, tile.to)) ?? [];
  const buckets = new Map<string, { onTime: number; delayed: number }>();
  for (const f of flights) {
    const day = f.date.slice(0, 10);
    const bucket = buckets.get(day) ?? { onTime: 0, delayed: 0 };
    if (f.delay > 0) bucket.delayed += 1;
    else bucket.onTime += 1;
    buckets.set(day, bucket);
  }
  const sortedDays = [...buckets.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const url = buildAndCacheChartUrl({
    type: 'bar',
    title: `Delays per day (${tile.from} → ${tile.to})`,
    labels: sortedDays.map(([day]) => day),
    datasets: [
      { label: 'On time', data: sortedDays.map(([, v]) => v.onTime) },
      { label: 'Delayed', data: sortedDays.map(([, v]) => v.delayed) },
    ],
  });
  dataSteps.push({
    name: 'renderFlightChart',
    args: {
      from: tile.from,
      to: tile.to,
      type: 'delaysPerDay',
      chartType: 'bar',
    },
    result: { days: sortedDays.length, url },
  });
  return chartTile(
    idx,
    surfaceId,
    `Delays per day ${tile.from} → ${tile.to}`,
    url,
  );
}

function chartTile(
  idx: number,
  surfaceId: string,
  title: string,
  chartUrl: string,
): TileBuildResult {
  const cardId = tileId(idx, 'card');
  const bodyId = tileId(idx, 'body');
  const titleId = tileId(idx, 'title');
  const imgId = tileId(idx, 'img');
  const path = pathFor(idx, 'chart');
  return {
    rootChildren: [cardId],
    components: [
      { id: cardId, component: 'Card', child: bodyId },
      { id: bodyId, component: 'Column', children: [titleId, imgId] },
      { id: titleId, component: 'Text', text: title, variant: 'h2' },
      { id: imgId, component: 'Image', url: { path } },
    ],
    dataOps: [dataOp(surfaceId, path, chartUrl)],
  };
}

function buildBoardingPasses(
  idx: number,
  tile: Extract<DashboardTile, { type: 'boardingPasses' }>,
  data: DashboardData,
  surfaceId: string,
): TileBuildResult {
  const requested = tile.count ?? 2;
  const sorted = sortBookedFlightsAscending(data.bookedFlights);
  const flights = sorted.slice(0, requested);

  if (flights.length === 0) {
    return { rootChildren: [], components: [], dataOps: [] };
  }

  const stackId = 'boarding-stack';
  const ticketIds = flights.map((_, j) => `${tileId(idx, 't')}${j}`);

  const components: Component[] = [
    { id: stackId, component: 'Column', children: ticketIds },
    ...flights.map((_flight, j) => {
      const path = (key: string) => pathFor(idx, `tickets/${j}/${key}`);
      const widget: Component = {
        id: ticketIds[j],
        component: 'TicketWidget',
        ticketId: { path: path('ticketId') },
        from: { path: path('from') },
        to: { path: path('to') },
        date: { path: path('date') },
        delay: { path: path('delay') },
      };
      return widget;
    }),
  ];

  const dataOps: A2uiMessage[] = flights.flatMap((flight, j) => {
    const path = (key: string) => pathFor(idx, `tickets/${j}/${key}`);
    return [
      dataOp(surfaceId, path('ticketId'), flight.id),
      dataOp(surfaceId, path('from'), flight.from),
      dataOp(surfaceId, path('to'), flight.to),
      dataOp(surfaceId, path('date'), flight.date.slice(0, 10)),
      dataOp(surfaceId, path('delay'), flight.delay),
    ];
  });

  return { rootChildren: [stackId], components, dataOps };
}

function buildBookedFlightsList(
  idx: number,
  tile: Extract<DashboardTile, { type: 'bookedFlightsList' }>,
  data: DashboardData,
  surfaceId: string,
  dataSteps: DataStep[],
): TileBuildResult {
  const allBooked = sortBookedFlightsAscending(data.bookedFlights);
  const flights = tile.maxRows ? allBooked.slice(0, tile.maxRows) : allBooked;
  const showCheckIn = tile.showCheckInButton ?? true;
  const showWeather = tile.showWeather ?? true;

  const cardId = tileId(idx, 'card');
  const bodyId = tileId(idx, 'body');
  const titleId = tileId(idx, 'title');

  if (flights.length === 0) {
    const emptyId = `${bodyId}-empty`;
    return {
      rootChildren: [cardId],
      components: [
        { id: cardId, component: 'Card', child: bodyId },
        { id: bodyId, component: 'Column', children: [titleId, emptyId] },
        {
          id: titleId,
          component: 'Text',
          text: 'My booked flights',
          variant: 'h2',
        },
        {
          id: emptyId,
          component: 'Text',
          text: 'You have no booked flights.',
          variant: 'body',
        },
      ],
      dataOps: [],
    };
  }

  const components: Component[] = [];
  const dataOps: A2uiMessage[] = [];
  const rowIds: string[] = [];

  flights.forEach((flight, j) => {
    const rowId = `${tileId(idx, 'r')}${j}`;
    const colId = `${rowId}-col`;
    const titleNodeId = `${rowId}-title`;
    const metaId = `${rowId}-meta`;
    const btnId = `${rowId}-btn`;
    const btnLabelId = `${btnId}-label`;
    rowIds.push(rowId);

    const path = (key: string) => pathFor(idx, `flights/${j}/${key}`);

    const colChildren = showCheckIn
      ? [titleNodeId, metaId, btnId]
      : [titleNodeId, metaId];

    components.push(
      {
        id: rowId,
        component: 'Row',
        align: 'start',
        children: [colId],
      },
      {
        id: colId,
        component: 'Column',
        weight: 3,
        children: colChildren,
      },
      {
        id: titleNodeId,
        component: 'Text',
        text: { path: path('route') },
        variant: 'h3',
      },
      {
        id: metaId,
        component: 'Text',
        text: { path: path('meta') },
        variant: 'body',
      },
    );

    if (showCheckIn) {
      components.push(
        {
          id: btnId,
          component: 'Button',
          child: btnLabelId,
          action: {
            event: {
              name: 'checkIn',
              context: { flightId: { path: path('id') } },
            },
          },
        },
        { id: btnLabelId, component: 'Text', text: 'Check in' },
      );
    }

    const statusText =
      flight.delay > 0 ? `Delayed by ${flight.delay} min` : 'On time';
    let meta: string;
    if (showWeather) {
      const w = weatherForecast(flight.to, flight.date);
      dataSteps.push({
        name: 'weatherForecast',
        args: { city: flight.to, date: flight.date.slice(0, 10) },
        result: { condition: w.condition, temperatureC: w.temperatureC },
      });
      meta = `${flight.date.slice(0, 10)} · ${weatherIconFor(w.condition)} ${w.condition} — ${w.temperatureC} °C · ${statusText}`;
    } else {
      meta = `${flight.date.slice(0, 10)} · ${statusText}`;
    }

    dataOps.push(
      dataOp(surfaceId, path('id'), flight.id),
      dataOp(surfaceId, path('route'), `${flight.from} → ${flight.to}`),
      dataOp(surfaceId, path('meta'), meta),
    );
  });

  components.unshift(
    { id: cardId, component: 'Card', child: bodyId },
    {
      id: bodyId,
      component: 'Column',
      children: [titleId, ...rowIds],
    },
    {
      id: titleId,
      component: 'Text',
      text: 'My booked flights',
      variant: 'h2',
    },
  );

  return { rootChildren: [cardId], components, dataOps };
}

function buildFlightSearch(
  idx: number,
  tile: Extract<DashboardTile, { type: 'flightSearch' }>,
  surfaceId: string,
): TileBuildResult {
  const cardId = tileId(idx, 'card');
  const bodyId = tileId(idx, 'body');
  const titleId = tileId(idx, 'title');
  const fromId = tileId(idx, 'from');
  const toId = tileId(idx, 'to');
  const btnId = tileId(idx, 'btn');
  const btnLabelId = `${btnId}-label`;
  const fromPath = pathFor(idx, 'search/from');
  const toPath = pathFor(idx, 'search/to');

  const components: Component[] = [
    { id: cardId, component: 'Card', child: bodyId },
    {
      id: bodyId,
      component: 'Column',
      children: [titleId, fromId, toId, btnId],
    },
    {
      id: titleId,
      component: 'Text',
      text: 'Find a flight',
      variant: 'h2',
    },
    {
      id: fromId,
      component: 'TextField',
      label: 'From',
      value: { path: fromPath },
    },
    {
      id: toId,
      component: 'TextField',
      label: 'To',
      value: { path: toPath },
    },
    {
      id: btnId,
      component: 'Button',
      child: btnLabelId,
      action: {
        event: {
          name: 'dashboardFlightSearch',
          context: {
            from: { path: fromPath },
            to: { path: toPath },
          },
        },
      },
    },
    { id: btnLabelId, component: 'Text', text: 'Search' },
  ];

  const dataOps = [
    dataOp(surfaceId, fromPath, tile.defaultFrom ?? 'Graz'),
    dataOp(surfaceId, toPath, tile.defaultTo ?? 'Hamburg'),
  ];

  return { rootChildren: [cardId], components, dataOps };
}

function buildRentalCars(
  idx: number,
  tile: Extract<DashboardTile, { type: 'rentalCars' }>,
  data: DashboardData,
  surfaceId: string,
  dataSteps: DataStep[],
): TileBuildResult {
  const city = tile.city ?? data.bookedFlights[0]?.to ?? FALLBACK_CITY;
  const result = searchRentalCars(city);
  const cars = tile.maxItems
    ? result.cars.slice(0, tile.maxItems)
    : result.cars;
  dataSteps.push({
    name: 'searchRentalCars',
    args: { city },
    result: { count: cars.length },
  });
  return imageRowList({
    idx,
    surfaceId,
    title: `Rent a car in ${result.city}`,
    items: cars.map((car) => ({
      imageUrl: car.imageUrl,
      title: `${car.category} — ${car.model}`,
      subtitle: `From ${car.pricePerDay} ${car.currency} / day`,
    })),
  });
}

function buildHotels(
  idx: number,
  tile: Extract<DashboardTile, { type: 'hotels' }>,
  data: DashboardData,
  surfaceId: string,
  dataSteps: DataStep[],
): TileBuildResult {
  const city = tile.city ?? data.bookedFlights[0]?.to ?? FALLBACK_CITY;
  const result = searchHotels(city);
  const hotels = tile.maxItems
    ? result.hotels.slice(0, tile.maxItems)
    : result.hotels;
  dataSteps.push({
    name: 'searchHotels',
    args: { city },
    result: { count: hotels.length },
  });
  return imageRowList({
    idx,
    surfaceId,
    title: `Hotels in ${result.city}`,
    items: hotels.map((hotel) => ({
      imageUrl: hotel.imageUrl,
      title: hotel.name,
      subtitle: `${hotel.stars}★ — from ${hotel.pricePerNight} ${hotel.currency} / night`,
    })),
  });
}

function buildWeatherList(
  idx: number,
  tile: Extract<DashboardTile, { type: 'weatherList' }>,
  data: DashboardData,
  surfaceId: string,
  dataSteps: DataStep[],
): TileBuildResult {
  const allBooked = data.bookedFlights;
  const flights = tile.maxRows ? allBooked.slice(0, tile.maxRows) : allBooked;
  const cardId = tileId(idx, 'card');
  const bodyId = tileId(idx, 'body');
  const titleId = tileId(idx, 'title');

  if (flights.length === 0) {
    const emptyId = `${bodyId}-empty`;
    return {
      rootChildren: [cardId],
      components: [
        { id: cardId, component: 'Card', child: bodyId },
        { id: bodyId, component: 'Column', children: [titleId, emptyId] },
        {
          id: titleId,
          component: 'Text',
          text: 'Weather at your destinations',
          variant: 'h2',
        },
        {
          id: emptyId,
          component: 'Text',
          text: 'No upcoming destinations.',
          variant: 'body',
        },
      ],
      dataOps: [],
    };
  }

  const components: Component[] = [];
  const dataOps: A2uiMessage[] = [];
  const rowIds: string[] = [];

  flights.forEach((flight, j) => {
    const lineId = `${tileId(idx, 'w')}${j}`;
    rowIds.push(lineId);
    const path = pathFor(idx, `items/${j}/text`);
    components.push({
      id: lineId,
      component: 'Text',
      text: { path },
      variant: 'body',
    });
    const w = weatherForecast(flight.to, flight.date);
    dataSteps.push({
      name: 'weatherForecast',
      args: { city: flight.to, date: flight.date.slice(0, 10) },
      result: { condition: w.condition, temperatureC: w.temperatureC },
    });
    const line = `${flight.to} · ${flight.date.slice(0, 10)} · ${weatherIconFor(w.condition)} ${w.condition} — ${w.temperatureC} °C`;
    dataOps.push(dataOp(surfaceId, path, line));
  });

  components.unshift(
    { id: cardId, component: 'Card', child: bodyId },
    {
      id: bodyId,
      component: 'Column',
      children: [titleId, ...rowIds],
    },
    {
      id: titleId,
      component: 'Text',
      text: 'Weather at your destinations',
      variant: 'h2',
    },
  );

  return { rootChildren: [cardId], components, dataOps };
}

function imageRowList(args: {
  idx: number;
  surfaceId: string;
  title: string;
  items: { imageUrl: string; title: string; subtitle: string }[];
}): TileBuildResult {
  const { idx, surfaceId, title, items } = args;
  const cardId = tileId(idx, 'card');
  const bodyId = tileId(idx, 'body');
  const titleId = tileId(idx, 'title');

  const components: Component[] = [];
  const dataOps: A2uiMessage[] = [];
  const rowIds: string[] = [];

  items.forEach((item, j) => {
    const rowId = `${tileId(idx, 'r')}${j}`;
    const imgId = `${rowId}-img`;
    const colId = `${rowId}-col`;
    const titleNodeId = `${rowId}-title`;
    const subId = `${rowId}-sub`;
    rowIds.push(rowId);

    const imgPath = pathFor(idx, `items/${j}/image`);
    const titlePath = pathFor(idx, `items/${j}/title`);
    const subPath = pathFor(idx, `items/${j}/subtitle`);

    components.push(
      { id: rowId, component: 'Row', align: 'start', children: [imgId, colId] },
      { id: imgId, component: 'Image', url: { path: imgPath }, weight: 1 },
      {
        id: colId,
        component: 'Column',
        weight: 3,
        children: [titleNodeId, subId],
      },
      {
        id: titleNodeId,
        component: 'Text',
        text: { path: titlePath },
        variant: 'h3',
      },
      {
        id: subId,
        component: 'Text',
        text: { path: subPath },
        variant: 'body',
      },
    );

    dataOps.push(
      dataOp(surfaceId, imgPath, item.imageUrl),
      dataOp(surfaceId, titlePath, item.title),
      dataOp(surfaceId, subPath, item.subtitle),
    );
  });

  components.unshift(
    { id: cardId, component: 'Card', child: bodyId },
    {
      id: bodyId,
      component: 'Column',
      children: [titleId, ...rowIds],
    },
    { id: titleId, component: 'Text', text: title, variant: 'h2' },
  );

  return { rootChildren: [cardId], components, dataOps };
}

function dataOp(surfaceId: string, path: string, value: unknown): A2uiMessage {
  return {
    version: A2UI_VERSION,
    updateDataModel: { surfaceId, path, value },
  } as unknown as A2uiMessage;
}

function tileId(idx: number, suffix: string): string {
  return `t${idx}-${suffix}`;
}

function pathFor(idx: number, suffix: string): string {
  return `/t${idx}/${suffix}`;
}

function routeKey(from: string, to: string): string {
  return `${from}|${to}`;
}

function titleFor(from: string, to: string, onlyDelayed: boolean): string {
  return onlyDelayed
    ? `Delayed flights ${from} → ${to}`
    : `Flights ${from} → ${to}`;
}

function cellText(id: string, path: string): Component {
  return {
    id,
    component: 'Text',
    text: { path },
    weight: 1,
  };
}

function headerText(id: string, label: string): Component {
  return {
    id,
    component: 'Text',
    text: label,
    variant: 'subtitle',
    weight: 1,
  };
}

function sortBookedFlightsAscending(flights: BookedFlight[]): BookedFlight[] {
  return [...flights].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}
