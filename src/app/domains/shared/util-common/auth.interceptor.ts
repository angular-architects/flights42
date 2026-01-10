import { HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const clonedReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ABCDEFG123456`),
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
