import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
    selector: 'app-login-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
    ],
    template: `
			<h1>Login</h1>

			<form (ngSubmit)="submit()">
				<label>
					Email
					<input name="email" [(ngModel)]="email" autocomplete="username" />
				</label>

				<label>
					Password
					<input
								name="password"
								type="password"
								[(ngModel)]="password"
								autocomplete="current-password"
					/>
				</label>

				<button type="submit">Login</button>
				<button type="button" (click)="clear()">Logout</button>

				<p *ngIf="error" style="color: crimson">{{ error }}</p>
			</form>
    `,
})
export class LoginPage {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    email = 'admin@pixelbyte.dev';
    password = '';
    error = '';

    submit() {
        this.error = '';

        this.auth.login(this.email, this.password).subscribe({
            next: () => {
                const returnUrl =
                  this.route.snapshot.queryParamMap.get('returnUrl') ?? '/controls';

                this.router.navigateByUrl(returnUrl).catch((e) => {
                    console.error('NAV FAILED', e);
                    this.error = `Login ok, aber Navigation ist fehlgeschlagen.`;
                });
            },
            error: (err) => {
                console.error('LOGIN ERROR', err);
                this.error = `Login fehlgeschlagen: ${err.status ?? ''} ${err.statusText ?? ''}`.trim();
            },
        });
    }

    clear() {
        this.auth.logout();
    }
}
