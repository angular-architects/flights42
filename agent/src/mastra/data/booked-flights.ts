export interface TicketingFlightWidgetData {
  id: number;
  from: string;
  to: string;
  date: string;
  delay: number;
}

export function getBookedFlightsData(
  now = new Date(),
): TicketingFlightWidgetData[] {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 1001,
      from: 'Hamburg',
      to: 'Graz',
      date: tomorrow.toISOString(),
      delay: 0,
    },
    {
      id: 1002,
      from: 'Vienna',
      to: 'Berlin',
      date: tomorrow.toISOString(),
      delay: 15,
    },
    {
      id: 1003,
      from: 'Frankfurt',
      to: 'Paris',
      date: dayAfterTomorrow.toISOString(),
      delay: 0,
    },
  ];
}
