import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterStateSnapshot,
} from '@angular/router';
import { filter, take } from 'rxjs';

import { PassengerDetailStore } from './passenger-detail-store';

// export const passengerResolver: ResolveFn<Passenger> = (
//   route: ActivatedRouteSnapshot,
//   _state: RouterStateSnapshot,
// ) => {
//   const passengerService = inject(PassengerService);
//   const id = route.paramMap.get('id') ?? '0';
//   return passengerService.findById(id);
// };

export const passengerResolver: ResolveFn<unknown> = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const passengerStore = inject(PassengerDetailStore);
  const id = route.paramMap.get('id') ?? '0';
  passengerStore.setPassengerId(+id);

  return toObservable(passengerStore.passengerStatus).pipe(
    filter((status) => status !== 'loading'),
    take(1),
    // delay(2000)
  );
};
