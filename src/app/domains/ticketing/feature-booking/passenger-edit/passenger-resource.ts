import { HttpErrorResponse } from '@angular/common/http';
import { inject, resource, Signal } from '@angular/core';
import { Params, RedirectCommand, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { PassengerClient } from '../../data/passenger-client';

export function createPassengerResource(params: Signal<Params>) {
  const passengerClient = inject(PassengerClient);
  const router = inject(Router);

  return resource({
    params: () => Number(params()['id'] ?? 0),
    loader: async ({ params: id }) => {
      try {
        return await firstValueFrom(passengerClient.findById(String(id)));
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          // Cancels the navigation and redirects instead of failing it
          throw new RedirectCommand(router.parseUrl('/not-found'));
        }
        throw error;
      }
    },
  });
}
