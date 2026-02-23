import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.currentUser()) {
        return true;
    }

    return auth.loadCurrentUser().pipe(
      map((loadedUser) => {
          if (loadedUser) {
              return true;
          }
          return router.createUrlTree([ '/login' ], {
              queryParams: { returnUrl: state.url },
          });
      }),
      catchError(() => {
          return of(router.createUrlTree([ '/login' ], {
              queryParams: { returnUrl: state.url },
          }));
      }),
    );
};
