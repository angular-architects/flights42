export interface Luggage {
  id: number;
  passengerName: string;
  weight: number;
  destination: string;
  status: string;
}

export const initLuggage: Luggage = {
  id: 0,
  passengerName: '',
  weight: 0,
  destination: '',
  status: '',
};
