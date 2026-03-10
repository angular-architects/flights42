import { Directive, model } from '@angular/core';
import { FormValueControl, transformedValue } from '@angular/forms/signals';
import { format, parse } from 'date-fns';

const DATE_FORMAT = 'dd.MM.yyyy HH:mm';

@Directive({
  selector: 'input[appDateInput]',
  host: {
    '[value]': 'formatted()',
    '(input)': 'update($event)',
  },
})
export class DateInput implements FormValueControl<string | null> {
  readonly value = model<string | null>('');

  protected readonly formatted = transformedValue(this.value, {
    parse: (userInput: string) => {
      const date = parse(userInput, DATE_FORMAT, 0);

      if (!date || isNaN(date.getTime())) {
        return {
          value: null,
          error: {
            kind: 'parse',
            message: `${userInput} is not a date`,
          },
        };
      }
      console.log('writing back', date.toISOString());
      return { value: date.toISOString() };
    },
    format: (val) => {
      const result = val ? format(val, DATE_FORMAT) : '';
      return result;
    },
  });

  protected update(event: Event): void {
    const target = event.target as HTMLInputElement;
    console.log('update', target.value);
    this.formatted.set(target.value);
  }
}
