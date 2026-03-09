import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
    selector: 'app-login-page',
    imports: [ReactiveFormsModule, NgOptimizedImage, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { style: 'display:flex;flex:1' },
    template: `
			<div class="login-wrapper">
				<header class="login-header" role="banner">
					<div class="login-header__inner">
						<div class="login-header__brand">
							<img ngSrc="NIS2Icon.png" alt="" width="28" height="28" priority />
							<span class="login-header__title">Pixelbyte</span>
						</div>
						<span class="login-header__product">NIS2 Compliance</span>
					</div>
				</header>

				<main class="login-main">
					<div class="login-card">
						<div class="login-card__header">
							<img ngSrc="NIS2Icon.png" alt="NIS2 Logo" width="48" height="48" priority />
							<h1 class="login-card__title">Willkommen zurück</h1>
							<p class="login-card__subtitle">Melden Sie sich an, um das NIS2 Control Center zu nutzen.</p>
						</div>

						<form class="login-form" [formGroup]="form" (ngSubmit)="submit()">
							<div class="login-field">
								<label class="login-label" for="login-email">E-Mail</label>
								<input
											id="login-email"
											class="login-input"
											formControlName="email"
											type="email"
											autocomplete="username"
											placeholder="name&#64;firma.de"
											[class.login-input--invalid]="isFieldInvalid('email')"
											[attr.aria-invalid]="isFieldInvalid('email')"
											[attr.aria-describedby]="isFieldInvalid('email') ? 'email-error' : null" />
								@if (isFieldInvalid('email')) {
									<div id="email-error" class="login-field-error" role="alert">
										@if (form.get('email')?.hasError('required')) {
											E-Mail-Adresse ist erforderlich.
										} @else if (form.get('email')?.hasError('email')) {
											Bitte geben Sie eine gültige E-Mail-Adresse ein.
										}
									</div>
								}
							</div>

							<div class="login-field">
								<label class="login-label" for="login-password">Passwort</label>
								<input
											id="login-password"
											class="login-input"
											formControlName="password"
											type="password"
											autocomplete="current-password"
											placeholder="••••••••"
											[class.login-input--invalid]="isFieldInvalid('password')"
											[attr.aria-invalid]="isFieldInvalid('password')"
											[attr.aria-describedby]="isFieldInvalid('password') ? 'password-error' : null" />
								@if (isFieldInvalid('password')) {
									<div id="password-error" class="login-field-error" role="alert">
										Passwort ist erforderlich.
									</div>
								}
							</div>

							@if (serverError()) {
								<div class="login-error" role="alert">{{ serverError() }}</div>
							}

							<button
										class="login-submit"
										type="submit"
										[disabled]="loading()">
								@if (loading()) {
									<span class="login-spinner" aria-hidden="true"></span>
									Anmelden…
								} @else {
									Anmelden
								}
							</button>
						</form>

						<div class="login-card__footer">
							<span class="login-hint">Testbenutzer: test&#64;pixelbyte.dev / Test123!</span>
							<a routerLink="/nis2-info" class="login-info-link">Was ist NIS2?</a>
						</div>
					</div>
				</main>
			</div>
    `,
    styleUrl: './login-page.scss',
})
export class LoginPage {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly fb = inject(FormBuilder);
    private readonly cdr = inject(ChangeDetectorRef);

    readonly serverError = signal('');
    readonly loading = signal(false);

    readonly form = this.fb.nonNullable.group({
        email: ['test@pixelbyte.dev', [Validators.required, Validators.email]],
        password: ['Test123!', [Validators.required]],
    });

    isFieldInvalid(field: string): boolean {
        const control = this.form.get(field);
        return !!control && control.invalid && (control.dirty || control.touched);
    }

    submit() {
        this.form.markAllAsTouched();
        this.serverError.set('');

        if (this.form.invalid) {
            return;
        }

        this.loading.set(true);
        const { email, password } = this.form.getRawValue();

        this.auth.getCsrfToken().subscribe({
            next: () => {
                this.auth.login(email, password).subscribe({
                    next: () => {
                        this.auth.loadCurrentUser().subscribe({
                            next: () => {
                                const returnUrl =
                                    this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
                                this.loading.set(false);
                                this.router.navigateByUrl(returnUrl).catch(() => {
                                    this.serverError.set('Login erfolgreich, Navigation fehlgeschlagen.');
                                });
                                this.cdr.markForCheck();
                            },
                            error: () => {
                                this.loading.set(false);
                                this.serverError.set('Benutzerdaten konnten nicht geladen werden.');
                                this.cdr.markForCheck();
                            },
                        });
                    },
                    error: (err) => {
                        this.loading.set(false);
                        this.serverError.set(this.extractErrorMessage(err));
                        this.cdr.markForCheck();
                    },
                });
            },
            error: () => {
                this.loading.set(false);
                this.serverError.set('Verbindung zum Server fehlgeschlagen. Bitte versuchen Sie es später erneut.');
                this.cdr.markForCheck();
            },
        });
    }

    private extractErrorMessage(err: unknown): string {
        const httpErr = err as { status?: number; error?: { message?: string | string[] } };

        if (httpErr.error?.message) {
            const msg = httpErr.error.message;
            return Array.isArray(msg) ? msg.join(' ') : msg;
        }

        if (httpErr.status === 0) {
            return 'Server nicht erreichbar. Bitte prüfen Sie Ihre Verbindung.';
        }

        if (httpErr.status === 401) {
            return 'E-Mail-Adresse oder Passwort ist falsch.';
        }

        if (httpErr.status === 429) {
            return 'Zu viele Anmeldeversuche. Bitte warten Sie einen Moment.';
        }

        return 'Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
    }
}
