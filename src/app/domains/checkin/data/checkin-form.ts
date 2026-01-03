import { PassengerForm } from './passenger-form';

export interface CheckinForm {
  ticketId: string;
  conditionsAccepted: boolean;
  passenger: PassengerForm;
}
