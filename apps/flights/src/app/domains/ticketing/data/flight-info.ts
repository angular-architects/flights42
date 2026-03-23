import { s } from '@hashbrownai/core';

export interface FlightInfo {
  id: number;
  from: string;
  to: string;
  date: string;
  delay: number;
}

export const FlightSchema = s.object('Flight to be displayed', {
  id: s.number('The flight id'),
  from: s.string('Departure city. No code but the city name'),
  to: s.string('Arrival city. No code but the city name'),
  date: s.string('Departure date in ISO format'),
  delay: s.number('If delayed, this represents the delay in minutes'),
});
