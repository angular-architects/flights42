import { randomUUID } from 'node:crypto';

import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import { A2UI_DEFAULT_CATALOG_ID } from '@internal/ag-ui-server';

import {
  type BookedFlight,
  getBookedFlights,
} from '../data/booked-flights-store.js';
import { buildAndCacheChartUrl } from '../tools/render-chart.js';
import { fetchFlights, type FlightRecord } from '../tools/search-flights.js';
import { searchHotels } from '../tools/search-hotels.js';
import { searchRentalCars } from '../tools/search-rental-cars.js';
import { weatherForecast, weatherIconFor } from '../tools/weather-forecast.js';
import type { DashboardSpec, DashboardTile } from './dashboard-spec.js';

const A2UI_VERSION = 'v0.9' as const;
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
export interface CompileDashboardOptions {
  surfaceId?: string;
  catalogId?: string;
}

export async function compileDashboard(
  spec: DashboardSpec,
  options: CompileDashboardOptions = {},
): Promise<CompiledDashboard> {
  const dataSteps: DataStep[] = [];
  const data = await fetchAllDashboardData(spec, dataSteps);
  return assembleDashboard(spec, data, options, dataSteps);
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

// Component ids and data-model paths are derived from the tile type so
// the emitted A2UI stays readable ("flights-table-card" instead of
// "t2-card"). Types occurring more than once in a spec get a 1-based
// suffix.
const TILE_SLUGS: Record<DashboardTile['type'], string> = {
  flightsTable: 'flights-table',
  delayedFlightsTable: 'delayed-flights-table',
  delayShareChart: 'delay-share-chart',
  delaysPerDayChart: 'delays-per-day-chart',
  boardingPasses: 'boarding-passes',
  bookedFlightsList: 'booked-flights',
  flightSearch: 'flight-search',
  rentalCars: 'rental-cars',
  hotels: 'hotels',
  weatherList: 'weather-list',
};

function tileBaseNames(tiles: DashboardTile[]): string[] {
  const totals = new Map<string, number>();
  for (const tile of tiles) {
    const slug = TILE_SLUGS[tile.type];
    totals.set(slug, (totals.get(slug) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  return tiles.map((tile) => {
    const slug = TILE_SLUGS[tile.type];
    if (totals.get(slug) === 1) {
      return slug;
    }
    const position = (seen.get(slug) ?? 0) + 1;
    seen.set(slug, position);
    return `${slug}-${position}`;
  });
}

function assembleDashboard(
  spec: DashboardSpec,
  data: DashboardData,
  options: CompileDashboardOptions,
  dataSteps: DataStep[],
): CompiledDashboard {
  const surfaceId = options.surfaceId ?? `dash-${randomUUID()}`;
  const catalogId = options.catalogId ?? A2UI_DEFAULT_CATALOG_ID;

  const allComponents: Component[] = [];
  const allDataOps: A2uiMessage[] = [];
  const rootChildren: string[] = [];

  const baseNames = tileBaseNames(spec.tiles);

  spec.tiles.forEach((tile, idx) => {
    const result = buildTile(baseNames[idx], tile, data, surfaceId, dataSteps);
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
      createSurface: { surfaceId, catalogId },
    } as unknown as A2uiMessage,
    {
      version: A2UI_VERSION,
      updateComponents: { surfaceId, components },
    } as unknown as A2uiMessage,
  ];

  return { surfaceId, structural, dataModel: allDataOps, dataSteps };
}

function buildTile(
  base: string,
  tile: DashboardTile,
  data: DashboardData,
  surfaceId: string,
  dataSteps: DataStep[],
): TileBuildResult {
  switch (tile.type) {
    case 'flightsTable':
      return buildFlightsTable(base, tile, data, surfaceId, false);
    case 'delayedFlightsTable':
      return buildFlightsTable(base, tile, data, surfaceId, true);
    case 'delayShareChart':
      return buildDelayShareChart(base, tile, data, surfaceId, dataSteps);
    case 'delaysPerDayChart':
      return buildDelaysPerDayChart(base, tile, data, surfaceId, dataSteps);
    case 'boardingPasses':
      return buildBoardingPasses(base, tile, data, surfaceId);
    case 'bookedFlightsList':
      return buildBookedFlightsList(base, tile, data, surfaceId, dataSteps);
    case 'flightSearch':
      return buildFlightSearch(base, tile, surfaceId);
    case 'rentalCars':
      return buildRentalCars(base, tile, data, surfaceId, dataSteps);
    case 'hotels':
      return buildHotels(base, tile, data, surfaceId, dataSteps);
    case 'weatherList':
      return buildWeatherList(base, tile, data, surfaceId, dataSteps);
  }
}

function buildFlightsTable(
  base: string,
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

  const cardId = nodeId(base, 'card');
  const bodyId = nodeId(base, 'body');
  const titleId = nodeId(base, 'title');
  const headerId = nodeId(base, 'header');
  const lastColumnHeader = onlyDelayed ? 'Delay (min)' : 'Status';
  const columnNames = [
    'flight',
    'date',
    'time',
    onlyDelayed ? 'delay' : 'status',
  ];
  const headerCellIds = columnNames.map((name) => `${headerId}-${name}`);

  const rowIds: string[] = [];
  const components: Component[] = [];
  const flightRows: {
    number: string;
    date: string;
    time: string;
    status: string;
  }[] = [];

  if (flights.length === 0) {
    const emptyId = nodeId(base, 'empty');
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
    return { rootChildren: [cardId], components, dataOps: [] };
  }

  for (let j = 0; j < flights.length; j += 1) {
    const rowId = `${nodeId(base, 'row')}-${j + 1}`;
    rowIds.push(rowId);
    const cellIds = columnNames.map((name) => `${rowId}-${name}`);
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
      cellText(cellIds[0], pathFor(base, `flights/${j}/number`)),
      cellText(cellIds[1], pathFor(base, `flights/${j}/date`)),
      cellText(cellIds[2], pathFor(base, `flights/${j}/time`)),
      cellText(cellIds[3], pathFor(base, `flights/${j}/status`)),
    );

    flightRows.push({
      number: String(f.id),
      date: datePart,
      time: timePart,
      status,
    });
  }

  components.unshift(
    { id: cardId, component: 'Card', child: bodyId },
    {
      id: bodyId,
      component: 'Column',
      children: [titleId, headerId, ...rowIds],
    },
    {
      id: titleId,
      component: 'Text',
      text: titleFor(tile.from, tile.to, onlyDelayed),
      variant: 'h2',
    },
    {
      id: headerId,
      component: 'Row',
      align: 'stretch',
      children: headerCellIds,
    },
    headerText(headerCellIds[0], 'Flight'),
    headerText(headerCellIds[1], 'Date'),
    headerText(headerCellIds[2], 'Time'),
    headerText(headerCellIds[3], lastColumnHeader),
  );

  const dataOps = [dataOp(surfaceId, tilePath(base), { flights: flightRows })];

  return { rootChildren: [cardId], components, dataOps };
}

function buildDelayShareChart(
  base: string,
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
    base,
    surfaceId,
    `Delay share ${tile.from} → ${tile.to}`,
    url,
  );
}

function buildDelaysPerDayChart(
  base: string,
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
    base,
    surfaceId,
    `Delays per day ${tile.from} → ${tile.to}`,
    url,
  );
}

function chartTile(
  base: string,
  surfaceId: string,
  title: string,
  chartUrl: string,
): TileBuildResult {
  const cardId = nodeId(base, 'card');
  const bodyId = nodeId(base, 'body');
  const titleId = nodeId(base, 'title');
  const chartId = nodeId(base, 'chart');
  const path = pathFor(base, 'chart');
  return {
    rootChildren: [cardId],
    components: [
      { id: cardId, component: 'Card', child: bodyId },
      { id: bodyId, component: 'Column', children: [titleId, chartId] },
      { id: titleId, component: 'Text', text: title, variant: 'h2' },
      { id: chartId, component: 'Image', url: { path } },
    ],
    dataOps: [dataOp(surfaceId, tilePath(base), { chart: chartUrl })],
  };
}

function buildBoardingPasses(
  base: string,
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

  const stackId = nodeId(base, 'stack');
  const ticketIds = flights.map((_, j) => `${nodeId(base, 'ticket')}-${j + 1}`);

  const components: Component[] = [
    { id: stackId, component: 'Column', children: ticketIds },
    ...flights.map((_flight, j) => {
      const path = (key: string) => pathFor(base, `tickets/${j}/${key}`);
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

  const tickets = flights.map((flight) => ({
    ticketId: flight.id,
    from: flight.from,
    to: flight.to,
    date: flight.date.slice(0, 10),
    delay: flight.delay,
  }));

  const dataOps = [dataOp(surfaceId, tilePath(base), { tickets })];

  return { rootChildren: [stackId], components, dataOps };
}

function buildBookedFlightsList(
  base: string,
  tile: Extract<DashboardTile, { type: 'bookedFlightsList' }>,
  data: DashboardData,
  surfaceId: string,
  dataSteps: DataStep[],
): TileBuildResult {
  const allBooked = sortBookedFlightsAscending(data.bookedFlights);
  const flights = tile.maxRows ? allBooked.slice(0, tile.maxRows) : allBooked;
  const showCheckIn = tile.showCheckInButton ?? true;
  const showWeather = tile.showWeather ?? true;

  const cardId = nodeId(base, 'card');
  const bodyId = nodeId(base, 'body');
  const titleId = nodeId(base, 'title');

  if (flights.length === 0) {
    const emptyId = nodeId(base, 'empty');
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
  const flightRows: { id: number; route: string; meta: string }[] = [];
  const rowIds: string[] = [];

  flights.forEach((flight, j) => {
    const rowId = `${nodeId(base, 'flight')}-${j + 1}`;
    const colId = `${rowId}-content`;
    const titleNodeId = `${rowId}-route`;
    const metaId = `${rowId}-details`;
    const btnId = `${rowId}-check-in`;
    const btnLabelId = `${btnId}-label`;
    rowIds.push(rowId);

    const path = (key: string) => pathFor(base, `flights/${j}/${key}`);

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

    flightRows.push({
      id: flight.id,
      route: `${flight.from} → ${flight.to}`,
      meta,
    });
  });

  const dataOps = [dataOp(surfaceId, tilePath(base), { flights: flightRows })];

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
  base: string,
  tile: Extract<DashboardTile, { type: 'flightSearch' }>,
  surfaceId: string,
): TileBuildResult {
  const cardId = nodeId(base, 'card');
  const bodyId = nodeId(base, 'body');
  const titleId = nodeId(base, 'title');
  const fromId = nodeId(base, 'from-field');
  const toId = nodeId(base, 'to-field');
  const btnId = nodeId(base, 'submit');
  const btnLabelId = `${btnId}-label`;
  const fromPath = pathFor(base, 'search/from');
  const toPath = pathFor(base, 'search/to');

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
    dataOp(surfaceId, tilePath(base), {
      search: {
        from: tile.defaultFrom ?? 'Graz',
        to: tile.defaultTo ?? 'Hamburg',
      },
    }),
  ];

  return { rootChildren: [cardId], components, dataOps };
}

function buildRentalCars(
  base: string,
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
    base,
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
  base: string,
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
    base,
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
  base: string,
  tile: Extract<DashboardTile, { type: 'weatherList' }>,
  data: DashboardData,
  surfaceId: string,
  dataSteps: DataStep[],
): TileBuildResult {
  const allBooked = data.bookedFlights;
  const flights = tile.maxRows ? allBooked.slice(0, tile.maxRows) : allBooked;
  const cardId = nodeId(base, 'card');
  const bodyId = nodeId(base, 'body');
  const titleId = nodeId(base, 'title');

  if (flights.length === 0) {
    const emptyId = nodeId(base, 'empty');
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
  const itemRows: { text: string }[] = [];
  const rowIds: string[] = [];

  flights.forEach((flight, j) => {
    const lineId = `${nodeId(base, 'entry')}-${j + 1}`;
    rowIds.push(lineId);
    const path = pathFor(base, `items/${j}/text`);
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
    itemRows.push({ text: line });
  });

  const dataOps = [dataOp(surfaceId, tilePath(base), { items: itemRows })];

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
  base: string;
  surfaceId: string;
  title: string;
  items: { imageUrl: string; title: string; subtitle: string }[];
}): TileBuildResult {
  const { base, surfaceId, title, items } = args;
  const cardId = nodeId(base, 'card');
  const bodyId = nodeId(base, 'body');
  const titleId = nodeId(base, 'title');

  const components: Component[] = [];
  const itemRows: { image: string; title: string; subtitle: string }[] = [];
  const rowIds: string[] = [];

  items.forEach((item, j) => {
    const rowId = `${nodeId(base, 'item')}-${j + 1}`;
    const imgId = `${rowId}-image`;
    const colId = `${rowId}-content`;
    const titleNodeId = `${rowId}-title`;
    const subId = `${rowId}-subtitle`;
    rowIds.push(rowId);

    const imgPath = pathFor(base, `items/${j}/image`);
    const titlePath = pathFor(base, `items/${j}/title`);
    const subPath = pathFor(base, `items/${j}/subtitle`);

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

    itemRows.push({
      image: item.imageUrl,
      title: item.title,
      subtitle: item.subtitle,
    });
  });

  const dataOps = [dataOp(surfaceId, tilePath(base), { items: itemRows })];

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

function nodeId(base: string, suffix: string): string {
  return `${base}-${suffix}`;
}

function pathFor(base: string, suffix: string): string {
  return `/${base}/${suffix}`;
}

// Root data-model path for a tile. Every tile now seeds its whole
// subtree with a single `updateDataModel` op at this path instead of one
// op per leaf value. A2UI's `DataModel.set` notifies descendant signals,
// so component bindings like `/flights-table/flights/0/number` still
// resolve.
function tilePath(base: string): string {
  return `/${base}`;
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
