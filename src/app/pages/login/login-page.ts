import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
    selector: 'app-login-page',
    imports: [
        CommonModule,
        FormsModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
			<div style="max-width: 400px; margin: 100px auto; padding: 2rem;">
				<h1>Login</h1>
				<form (ngSubmit)="submit()">
					<label style="display: block; margin-bottom: 1rem;">
						Email
						<input
									name="email"
									[(ngModel)]="email"
									autocomplete="username"
									style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;" />
					</label>
					<label style="display: block; margin-bottom: 1rem;">
						Password
						<input
									name="password"
									type="password"
									[(ngModel)]="password"
									autocomplete="current-password"
									style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;" />
					</label>
					<div style="display: flex; gap: 1rem; margin-top: 1rem;">
						<button type="submit" style="flex: 1; padding: 0.75rem;">Login</button>
						<button type="button" (click)="clear()" style="flex: 1; padding: 0.75rem;">Logout</button>
					</div>
					@if (error) {
						<p style="color: crimson; margin-top: 1rem;">{{ error }}</p>
					}
					@if (loading) {
						<p style="margin-top: 1rem;">Loading...</p>
					}
				</form>
			</div>
    `,
})
export class LoginPage {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    email = '';
    password = '';
    error = '';
    loading = false;

    submit() {
        this.error = '';
        this.loading = true;

        this.auth.getCsrfToken().subscribe({
            next: () => {
                this.auth.login(this.email, this.password).subscribe({
                    next: () => {
                        this.auth.loadCurrentUser().subscribe({
                            next: () => {
                                const returnUrl =
                                  this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
                                this.loading = false;
                                this.router.navigateByUrl(returnUrl).catch(() => {
                                    this.error = 'Login ok, aber Navigation fehlgeschlagen.';
                                });
                            },
                            error: () => {
                                this.loading = false;
                                this.error = 'User-Daten konnten nicht geladen werden.';
                            },
                        });
                    },
                    error: (err) => {
                        this.loading = false;
                        this.error = `Login fehlgeschlagen: ${err.status ?? ''} ${err.statusText ?? ''}`.trim();
                    },
                });
            },
            error: () => {
                this.loading = false;
                this.error = 'CSRF-Token konnte nicht geladen werden.';
            },
        });
    }

    clear() {
        this.loading = true;
        this.auth.logout().subscribe({
            next: () => {
                this.loading = false;
                this.error = '';
                this.password = '';
            },
            error: () => {
                this.loading = false;
            },
        });
    }
}
