import { Injectable, Type } from '@angular/core';
import { Subject } from 'rxjs';

import { DialogInfo } from './dialog-info';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private readonly dialogInfoSubject = new Subject<DialogInfo>();
  readonly dialogInfo$ = this.dialogInfoSubject.asObservable();

  show(comp: Type<unknown>, data: unknown): void {
    this.dialogInfoSubject.next({
      component: comp,
      data,
    });
  }

  hide(): void {
    this.dialogInfoSubject.next({
      component: null,
      data: null,
    });
  }
}
