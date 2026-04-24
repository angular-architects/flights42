import type { BoundProperty } from '@a2ui/angular/v0_9';
import { signal } from '@angular/core';

export interface TicketWidgetContext {
  ticketId: BoundProperty<string | number>;
  from: BoundProperty<string>;
  to: BoundProperty<string>;
  date: BoundProperty<string>;
  delay: BoundProperty<number>;
}

function initialProperty<T>(value: T): BoundProperty<T> {
  return {
    value: signal(value).asReadonly(),
    raw: value,
    onUpdate: () => undefined,
  };
}

export const initialTicketContext: TicketWidgetContext = {
  ticketId: initialProperty<string | number>(''),
  from: initialProperty(''),
  to: initialProperty(''),
  date: initialProperty(''),
  delay: initialProperty(0),
};
