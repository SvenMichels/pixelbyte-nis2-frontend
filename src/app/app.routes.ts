import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },

    {
        path: 'login',
        loadComponent: () => import('./pages/login/login-page').then((m) => m.LoginPage),
    },
    {
        path: 'nis2-info',
        loadComponent: () => import('./pages/nis2-info/nis2-info-page.component').then((m) => m.Nis2InfoPageComponent),
    },

    { path: 'dashboard', component: DashboardPageComponent, canActivate: [ authGuard ] },
    {
        path: 'controls',
        loadComponent: () => import('./features/controls/pages/controls-page.component').then((m) => m.ControlsPageComponent),
        canActivate: [ authGuard ],
    },
    {
        path: 'controls/:id',
        loadComponent: () => import('./features/controls/pages/control-detail-page.component').then((m) => m.ControlDetailPageComponent),
        canActivate: [ authGuard ],
    },
    {
        path: 'risks',
        loadComponent: () => import('./features/risks/pages/risks-page.component').then((m) => m.RisksPageComponent),
        canActivate: [ authGuard ],
    },
    {
        path: 'risks/:id',
        loadComponent: () => import('./features/risks/pages/risk-detail-page.component').then((m) => m.RiskDetailPageComponent),
        canActivate: [ authGuard ],
    },
];