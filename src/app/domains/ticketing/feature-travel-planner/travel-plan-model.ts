import { FlightInfo } from '../data/flight-info';
import { HotelInfo } from '../data/hotel-info';

export interface TravelPlan {
  summary: string;
  flights: FlightInfo[];
  hotels: HotelInfo[];
}

export const initialTravelPlan: TravelPlan = {
  summary: '',
  flights: [],
  hotels: [],
};
