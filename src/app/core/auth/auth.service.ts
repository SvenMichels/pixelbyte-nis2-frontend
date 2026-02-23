import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';

type Role = 'USER' | 'ADMIN' | 'SECURITY' | 'AUDITOR';

interface User {
    id: string;
    email: string;
    role: Role;
}

interface LoginResponse {
    ok: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);

    readonly currentUser = signal<User | null>(null);
    readonly isAuthenticated = signal<boolean>(false);

    getCsrfToken() {
        return this.http.get<{ ok: boolean }>('/api/auth/csrf');
    }

    refresh() {
        return this.http.post<{ ok: boolean }>('/api/auth/refresh', {});
    }

    login(email: string, password: string) {
        return this.http.post<LoginResponse>('/api/auth/login', { email, password });
    }

    logout() {
        this.currentUser.set(null);
        this.isAuthenticated.set(false);

        return this.http.post<{ ok: boolean }>('/api/auth/logout', {}).pipe(
          catchError(() => of({ ok: true })),
        );
    }

    loadCurrentUser() {
        return this.http.get<User>('/api/auth/me').pipe(
          tap((user) => {
              this.currentUser.set(user);
              this.isAuthenticated.set(true);
          }),
          catchError(() => {
              this.currentUser.set(null);
              this.isAuthenticated.set(false);
              return of(null);
          }),
        );
    }

    checkAuth() {
        if (this.isAuthenticated() && this.currentUser()) {
            return of(true);
        }

        return this.loadCurrentUser().pipe(
          map((user) => !!user),
          catchError(() => of(false)),
        );
    }
}