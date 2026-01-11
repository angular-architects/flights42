import { PassengerInfo } from './passenger-info';

export interface CheckinInfo {
  ticketId: string;
  conditionsAccepted: boolean;
  passenger: PassengerInfo;
}
