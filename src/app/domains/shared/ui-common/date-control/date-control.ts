import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { FormValueControl, transformedValue } from '@angular/forms/signals';
import { format, parse } from 'date-fns';

const DATE_FORMAT = 'dd.MM.yyyy';
const TIME_FORMAT = 'HH:mm';
const DATE_TIME_FORMAT = `${DATE_FORMAT} ${TIME_FORMAT}`;

interface DateTimeParts {
  date: string;
  time: string;
}

@Component({
  selector: 'app-date-control',
  imports: [],
  templateUrl: './date-control.html',
  styleUrl: './date-control.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateControl implements FormValueControl<string | null> {
  readonly value = model<string | null>(null);

  protected readonly internal = transformedValue(this.value, {
    parse: (raw: DateTimeParts) => {
      if (!raw.date && !raw.time) {
        return { value: null };
      }

      const rawValue = `${raw.date} ${raw.time}`;
      const combined = parse(rawValue, DATE_TIME_FORMAT, new Date());

      if (isNaN(combined.getTime())) {
        return {
          value: null,
          error: {
            kind: 'parse',
            message: `${rawValue} is not a valid date/time`,
          },
        };
      }

      return { value: combined.toISOString() };
    },
    format: (val): DateTimeParts => {
      if (!val) {
        return { date: '', time: '' };
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) {
        return { date: '', time: '' };
      }
      return {
        date: format(d, DATE_FORMAT),
        time: format(d, TIME_FORMAT),
      };
    },
  });

  protected updateDate(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.internal.set({ ...this.internal(), date: target.value });
  }

  protected updateTime(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.internal.set({ ...this.internal(), time: target.value });
  }
}
