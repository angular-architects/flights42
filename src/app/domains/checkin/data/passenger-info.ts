export interface AddressInfo {
  street: string;
  zipCode: string;
  city: string;
  country: string;
}

export interface PassengerInfo {
  firstName: string;
  lastName: string;
  email: string;
  address: AddressInfo;
}

export const initPassengerInfo: PassengerInfo = {
  firstName: '',
  lastName: '',
  email: '',
  address: {
    street: '',
    zipCode: '',
    city: '',
    country: '',
  },
};
