import { HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const clonedReq = req.clone({
    headers: req.headers.set(
      'Authorization',
      `Bearer ${authService.authToken()}`,
    ),
  });

  return next(clonedReq).pipe(
    catchError((error) => {
      if (
        error.status === HttpStatusCode.Unauthorized ||
        error.status === HttpStatusCode.Unauthorized
      ) {
        console.log('you need to login!');
      }
      return throwError(() => error);
    }),
  );
};
