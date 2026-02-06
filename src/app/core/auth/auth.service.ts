import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

type Role = 'ADMIN' | 'SECURITY' | 'AUDITOR' | 'USER';

interface LoginResponse {
    accessToken: string;
    user: { id: string; email: string; role: Role };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly TOKEN_KEY = 'accessToken';

    login(email: string, password: string) {
        return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
          tap((res) => localStorage.setItem(this.TOKEN_KEY, res.accessToken)),
        );
    }

    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    hasValidToken(): boolean {
        const token = this.getToken();
        if (!token) return false;

        const exp = this.getTokenExp(token);
        if (!exp) return true;
        return Date.now() < exp * 1000;
    }

    private getTokenExp(token: string): number | null {
        const payload = this.getTokenPayload(token);
        const exp = payload?.exp;
        return typeof exp === 'number' ? exp : null;
    }

    private getTokenPayload(token: string): any | null {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        try {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const json = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
            );
            return JSON.parse(json);
        } catch {
            return null;
        }
    }
}
