import { FlightInfo } from '../data/flight-info';
import { HotelInfo } from '../data/hotel-info';

// In case the model mixed up the order,
// align the hotels with the flight segments.
export function sortHotelsByRoute(
  hotels: HotelInfo[],
  flights: FlightInfo[],
): HotelInfo[] {
  const arrivalOrder = new Map<string, number>();
  flights.forEach((flight, index) => {
    if (!arrivalOrder.has(flight.to)) {
      arrivalOrder.set(flight.to, index);
    }
  });

  const rank = (hotel: HotelInfo): number =>
    arrivalOrder.get(hotel.city) ?? Number.MAX_SAFE_INTEGER;

  return [...hotels].sort((a, b) => rank(a) - rank(b));
}
