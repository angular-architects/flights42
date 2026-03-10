import { computed, Directive, model } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { format, parse } from 'date-fns';

const DATE_FORMAT = 'dd.MM.yyyy HH:mm';

@Directive({
  selector: 'input[appSimpleDateInput]',
  host: {
    '[value]': 'formatted()',
    '(blur)': 'update($event)',
  },
})
export class SimpleDateInput implements FormValueControl<string | null> {
  readonly value = model<string | null>('');

  protected readonly formatted = computed(() =>
    format(this.value() ?? '', DATE_FORMAT),
  );

  protected update(event: Event): void {
    const target = event.target as HTMLInputElement;
    const date = parse(target.value, DATE_FORMAT, 0);

    if (date) {
      this.value.set(date.toISOString());
    } else {
      this.value.set(null);
    }
  }
}
