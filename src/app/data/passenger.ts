export interface Passenger {
  id: number;
  name: string;
  firstName: string;
  bonusMiles: number;
  passengerStatus: string;
}

export const initPassenger: Passenger = {
  id: 0,
  name: '',
  firstName: '',
  bonusMiles: 0,
  passengerStatus: '',
};
