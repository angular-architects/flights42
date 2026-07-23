import type { BoundProperty } from '@a2ui/angular/v0_9';
import { signal } from '@angular/core';
import { z } from 'zod/v3';

import {
  binding,
  type ContextFromSchema,
} from '../../../../shared/util-copilotkit/a2ui/a2ui-schema';

export const ticketWidgetSchema = z
  .object({
    ticketId: binding(z.union([z.string(), z.number()])),
    from: binding(z.string()),
    to: binding(z.string()),
    date: binding(z.string()),
    delay: binding(z.number()).optional(),
  })
  .strict();

export type TicketWidgetContext = ContextFromSchema<typeof ticketWidgetSchema>;

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
