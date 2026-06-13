const FLIGHT_API_BASE = 'https://demo.angulararchitects.io/api/flight';
const bookedFlightIds = new Set([1, 2, 50, 390]);
const flightCache = new Map();
export async function fetchFlight(id) {
  if (flightCache.has(id)) {
    return flightCache.get(id);
  }
  const response = await fetch(`${FLIGHT_API_BASE}/${id}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load flight ${id}: ${response.status}`);
  }
  const raw = await response.json();
  const flight = {
    id: raw.id,
    from: raw.from,
    to: raw.to,
    date: raw.date,
    delay: raw.delayed ? (raw.delay ?? 0) : 0,
  };
  flightCache.set(id, flight);
  return flight;
}
export function isBooked(flightId) {
  return bookedFlightIds.has(flightId);
}
export function addBooking(flightId) {
  bookedFlightIds.add(flightId);
}
export function removeBooking(flightId) {
  bookedFlightIds.delete(flightId);
}
export function getBookedFlightIds() {
  return [...bookedFlightIds];
}
export async function getBookedFlights() {
  const ids = getBookedFlightIds();
  const flights = await Promise.all(ids.map((id) => fetchFlight(id)));
  return flights.filter((flight) => flight !== null);
}
