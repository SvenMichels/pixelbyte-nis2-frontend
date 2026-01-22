import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ControlsPageComponent } from './features/controls/pages/controls-page.component';

export const routes: Routes = [
    { path: '', redirectTo: 'controls', pathMatch: 'full' },

    {
        path: 'login',
        loadComponent: () => import('./pages/login/login-page').then((m) => m.LoginPage),
    },

    { path: 'controls', component: ControlsPageComponent, canActivate: [ authGuard ] },
];