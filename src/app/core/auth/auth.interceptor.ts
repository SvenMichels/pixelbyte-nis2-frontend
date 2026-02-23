import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return next(req).pipe(
      catchError((err: HttpErrorResponse) => {
          if (err.status === 401) {
              if (req.url.includes('/auth/me')) {
                  auth.currentUser.set(null);
                  auth.isAuthenticated.set(false);
                  return throwError(() => err);
              }

              auth.currentUser.set(null);
              auth.isAuthenticated.set(false);

              if (!router.url.startsWith('/login')) {
                  router.navigateByUrl('/login');
              }

              return throwError(() => err);
          }

          if (err.status === 403) {
              if (req.url.includes('/auth/logout') && !router.url.startsWith('/login')) {
                  router.navigateByUrl('/login');
              }
          }

          return throwError(() => err);
      }),
    );
};

