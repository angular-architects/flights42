import { format } from 'date-fns';

const UI_DATE_TIME_FORMAT = 'dd.MM.yyyy HH:mm';

export function toLocalDateTimeString(isoString: string): string {
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (!isoString) return '';

  const date = new Date(isoString);
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes())
  );
}

export function formatUiDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, UI_DATE_TIME_FORMAT);
}
