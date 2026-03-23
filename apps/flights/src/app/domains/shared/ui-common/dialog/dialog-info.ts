import { Type } from '@angular/core';

export interface DialogEvent {
  component: Type<unknown> | null;
  data: unknown;
}
