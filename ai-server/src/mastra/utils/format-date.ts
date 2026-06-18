/**
 * Returns just the ISO day (YYYY-MM-DD) of a date string, dropping any time
 * component. Used to compare/filter on the day only (the demo data ignores
 * times).
 */
export function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function formatFlightDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}
