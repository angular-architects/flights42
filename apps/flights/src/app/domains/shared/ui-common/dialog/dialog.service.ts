import { inject, Injectable, Type } from '@angular/core';
import { Subject } from 'rxjs';

import { DialogEvent } from './dialog-event';
import { DialogOutletService } from './dialog-outlet-service';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private dialogOutletService = inject(DialogOutletService);

  private readonly dialogEvents = new Subject<DialogEvent>();
  readonly dialogEvents$ = this.dialogEvents.asObservable();

  show(comp: Type<unknown>, data: unknown): void {
    this.dialogOutletService.ensureOutlet();
    this.dialogEvents.next({
      component: comp,
      data,
    });
  }

  hide(): void {
    this.dialogEvents.next({
      component: null,
      data: null,
    });
  }
}
