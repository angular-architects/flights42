import { Dialog } from '@angular/cdk/dialog';
import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanDeactivateFn,
  RouterStateSnapshot,
} from '@angular/router';
import { map } from 'rxjs';

import { ConfirmComponent } from './confirm';

export interface FormComponent {
  isDirty(): boolean;
}

export const exitGuard: CanDeactivateFn<FormComponent> = (
  component: FormComponent,
  _currentRoute: ActivatedRouteSnapshot,
  _currentState: RouterStateSnapshot,
  _nextState: RouterStateSnapshot,
) => {
  const dialog = inject(Dialog);

  if (!component.isDirty()) {
    return true;
  }

  const dialogRef = dialog.open<boolean>(ConfirmComponent, {
    data: 'Do you really want to leave without saving?',
  });

  return dialogRef.closed.pipe(map((result) => (result ? true : false)));
};
