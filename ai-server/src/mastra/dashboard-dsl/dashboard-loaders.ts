import {
  type BookedFlight,
  getBookedFlights,
} from '../data/booked-flights-store.js';
import { buildAndCacheChartUrl } from '../tools/render-chart.js';
import { fetchFlights } from '../tools/search-flights.js';
import { searchHotels } from '../tools/search-hotels.js';
import { searchRentalCars } from '../tools/search-rental-cars.js';
import { weatherForecast, weatherIconFor } from '../tools/weather-forecast.js';
import type {
  BoardingPassesNode,
  BookedFlightsListNode,
  DelayedFlightsTableNode,
  DelayShareChartNode,
  DelaysPerDayChartNode,
  FlightSearchNode,
  FlightsTableNode,
  HotelsNode,
  RentalCarsNode,
  WeatherListNode,
} from './dashboard-spec.js';

// Default cap on rows we render per flight table tile when the spec
// doesn't override it. Protects us from runaway DOM trees if the
// upstream data grows. Tile types that previously had no cap stay
// uncapped by default; the DSL exposes `maxRows`/`maxItems` for
// per-tile overrides.
const DEFAULT_FLIGHT_TABLE_MAX_ROWS = 30;
const FALLBACK_CITY = 'Hamburg';

export interface FlightsTableData {
  flights: { number: string; date: string; time: string; status: string }[];
  emptyMessage: string;
}

export interface ChartData {
  chart: string;
}

export interface BoardingPassesData {
  tickets: {
    id: number;
    from: string;
    to: string;
    date: string;
    delay: number;
  }[];
}

export interface BookedFlightsListData {
  flights: { id: number; route: string; meta: string }[];
  emptyMessage: string;
}

export interface FlightSearchData {
  search: { from: string; to: string };
}

export interface ImageRowListData {
  title: string;
  items: { image: string; title: string; subtitle: string }[];
}

export interface WeatherListData {
  items: { text: string }[];
  emptyMessage: string;
}

export async function loadFlightsTable(
  node: FlightsTableNode | DelayedFlightsTableNode,
  onlyDelayed: boolean,
): Promise<FlightsTableData> {
  const all = await fetchFlights(node.from, node.to);
  const filtered = onlyDelayed ? all.filter((f) => f.delay > 0) : all;
  const limit = node.maxRows ?? DEFAULT_FLIGHT_TABLE_MAX_ROWS;
  const flights = filtered.slice(0, limit).map((f) => {
    const status = onlyDelayed
      ? String(f.delay)
      : f.delay > 0
        ? `Delayed by ${f.delay} min`
        : 'On time';
    return {
      number: String(f.id),
      date: f.date.slice(0, 10),
      time: f.date.slice(11, 16),
      status,
    };
  });
  const emptyText = onlyDelayed
    ? 'No delayed flights for this route.'
    : 'No flights found for this route.';
  return { flights, emptyMessage: flights.length === 0 ? emptyText : '' };
}

export async function loadDelayShareChart(
  node: DelayShareChartNode,
): Promise<ChartData> {
  const flights = await fetchFlights(node.from, node.to);
  let onTime = 0;
  let delayed = 0;
  for (const f of flights) {
    if (f.delay > 0) {
      delayed += 1;
    } else {
      onTime += 1;
    }
  }
  const chart = buildAndCacheChartUrl({
    type: node.chartType ?? 'pie',
    title: `On-time vs. delayed (${node.from} → ${node.to})`,
    labels: ['On time', 'Delayed'],
    datasets: [{ label: 'Flights', data: [onTime, delayed] }],
  });
  return { chart };
}

export async function loadDelaysPerDayChart(
  node: DelaysPerDayChartNode,
): Promise<ChartData> {
  const flights = await fetchFlights(node.from, node.to);
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
  const sortedDays = [...buckets.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const chart = buildAndCacheChartUrl({
    type: 'bar',
    title: `Delays per day (${node.from} → ${node.to})`,
    labels: sortedDays.map(([day]) => day),
    datasets: [
      { label: 'On time', data: sortedDays.map(([, v]) => v.onTime) },
      { label: 'Delayed', data: sortedDays.map(([, v]) => v.delayed) },
    ],
  });
  return { chart };
}

export async function loadBoardingPasses(
  node: BoardingPassesNode,
): Promise<BoardingPassesData> {
  const bookedFlights = await getBookedFlights();
  const sorted = sortBookedFlightsAscending(bookedFlights);
  const tickets = sorted.slice(0, node.count ?? 2).map((flight) => ({
    id: flight.id,
    from: flight.from,
    to: flight.to,
    date: flight.date.slice(0, 10),
    delay: flight.delay,
  }));
  return { tickets };
}

export async function loadBookedFlightsList(
  node: BookedFlightsListNode,
): Promise<BookedFlightsListData> {
  const bookedFlights = await getBookedFlights();
  const allBooked = sortBookedFlightsAscending(bookedFlights);
  const selected = node.maxRows ? allBooked.slice(0, node.maxRows) : allBooked;
  const showWeather = node.showWeather ?? true;
  const flights = selected.map((flight) => {
    const meta = formatMeta(flight, showWeather);
    return { id: flight.id, route: `${flight.from} → ${flight.to}`, meta };
  });
  const emptyMessage =
    flights.length === 0 ? 'You have no booked flights.' : '';
  return { flights, emptyMessage };
}

export async function loadFlightSearch(
  node: FlightSearchNode,
): Promise<FlightSearchData> {
  return {
    search: {
      from: node.defaultFrom ?? 'Graz',
      to: node.defaultTo ?? 'Hamburg',
    },
  };
}

export async function loadRentalCars(
  node: RentalCarsNode,
): Promise<ImageRowListData> {
  const city = await resolveCity(node.city);
  const result = searchRentalCars(city);
  const cars = node.maxItems
    ? result.cars.slice(0, node.maxItems)
    : result.cars;
  const items = cars.map((car) => ({
    image: car.imageUrl,
    title: `${car.category} — ${car.model}`,
    subtitle: `From ${car.pricePerDay} ${car.currency} / day`,
  }));
  return { title: `Rent a car in ${result.city}`, items };
}

export async function loadHotels(node: HotelsNode): Promise<ImageRowListData> {
  const city = await resolveCity(node.city);
  const result = searchHotels(city);
  const hotels = node.maxItems
    ? result.hotels.slice(0, node.maxItems)
    : result.hotels;
  const items = hotels.map((hotel) => ({
    image: hotel.imageUrl,
    title: hotel.name,
    subtitle: `${hotel.stars}★ — from ${hotel.pricePerNight} ${hotel.currency} / night`,
  }));
  return { title: `Hotels in ${result.city}`, items };
}

export async function loadWeatherList(
  node: WeatherListNode,
): Promise<WeatherListData> {
  const allBooked = await getBookedFlights();
  const flights = node.maxRows ? allBooked.slice(0, node.maxRows) : allBooked;
  const items = flights.map((flight) => {
    const w = weatherForecast(flight.to, flight.date);
    const text = `${w.city} · ${w.date} · ${weatherIconFor(w.condition)} ${w.condition} — ${w.temperatureC} °C`;
    return { text };
  });
  const emptyMessage = items.length === 0 ? 'No upcoming destinations.' : '';
  return { items, emptyMessage };
}

async function resolveCity(city: string | undefined): Promise<string> {
  if (city) {
    return city;
  }
  const bookedFlights = await getBookedFlights();
  return bookedFlights[0]?.to ?? FALLBACK_CITY;
}

function formatMeta(flight: BookedFlight, showWeather: boolean): string {
  const date = flight.date.slice(0, 10);
  const status =
    flight.delay > 0 ? `Delayed by ${flight.delay} min` : 'On time';
  if (!showWeather) {
    return `${date} · ${status}`;
  }
  const w = weatherForecast(flight.to, flight.date);
  return `${date} · ${weatherIconFor(w.condition)} ${w.condition} — ${w.temperatureC} °C · ${status}`;
}

function sortBookedFlightsAscending(flights: BookedFlight[]): BookedFlight[] {
  return [...flights].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}
