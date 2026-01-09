import { Type } from '@angular/core';

export interface DialogInfo {
  component: Type<unknown> | null;
  data: unknown;
}
