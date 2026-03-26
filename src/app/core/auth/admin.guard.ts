import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const check = () => {
        const user = auth.currentUser();
        if (user?.role === 'ADMIN') return true;
        return router.createUrlTree(['/dashboard']);
    };

    if (auth.currentUser()) {
        return check();
    }

    return auth.loadCurrentUser().pipe(
        map(() => check()),
        catchError(() =>
            of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })),
        ),
    );
};

