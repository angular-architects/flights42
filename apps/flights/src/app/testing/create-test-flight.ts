export function createTestFlight(id: number, from = 'Paris', to = 'London') {
  const date = new Date().toISOString();
  const delayed = false;

  const flight = { id, from, to, date, delayed };
  return flight;
}
