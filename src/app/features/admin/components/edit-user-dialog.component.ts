import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UpdateUserDto, UserDto, UserRole, UsersApiService } from '../../../core/api/users-api.service';

@Component({
    selector: 'pb-edit-user-dialog',
    imports: [ ReactiveFormsModule ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
			<div
						class="dialog-backdrop"
						(click)="onBackdropClick($event)"
						(keydown.escape)="close()"
						role="dialog"
						aria-modal="true"
						aria-labelledby="edit-user-title">

				<div class="dialog" (click)="$event.stopPropagation()">
					<header class="dialog__header">
						<h2 id="edit-user-title" class="dialog__title">Benutzer bearbeiten</h2>
						<button
									type="button"
									class="dialog__close"
									aria-label="Dialog schließen"
									(click)="close()">
							✕
						</button>
					</header>

					<form class="dialog__form" [formGroup]="form" (ngSubmit)="submit()">
						<div class="dialog__field">
							<label class="dialog__label" for="edit-email">E-Mail</label>
							<input
										id="edit-email"
										class="dialog__input"
										formControlName="email"
										type="email"
										autocomplete="off"
										[class.dialog__input--invalid]="isInvalid('email')"
										[attr.aria-invalid]="isInvalid('email')"
										[attr.aria-describedby]="isInvalid('email') ? 'edit-email-err' : null" />
							@if (isInvalid('email')) {
								<div id="edit-email-err" class="dialog__field-error" role="alert">
									@if (form.get('email')?.hasError('required')) {
										E-Mail ist erforderlich.
									} @else if (form.get('email')?.hasError('email')) {
										Ungültige E-Mail-Adresse.
									}
								</div>
							}
						</div>

						<div class="dialog__field">
							<label class="dialog__label" for="edit-password">Neues Passwort</label>
							<input
										id="edit-password"
										class="dialog__input"
										formControlName="password"
										type="password"
										autocomplete="new-password"
										placeholder="Leer lassen = nicht ändern"
										[class.dialog__input--invalid]="isInvalid('password')"
										[attr.aria-invalid]="isInvalid('password')"
										[attr.aria-describedby]="isInvalid('password') ? 'edit-pw-err' : null" />
							@if (isInvalid('password')) {
								<div id="edit-pw-err" class="dialog__field-error" role="alert">
									Mindestens 8 Zeichen.
								</div>
							}
						</div>

						<div class="dialog__field">
							<label class="dialog__label" for="edit-role">Rolle</label>
							<select
										id="edit-role"
										class="dialog__input"
										formControlName="role">
								@for (opt of roleOptions; track opt.value) {
									<option [value]="opt.value">{{ opt.label }}</option>
								}
							</select>
						</div>

						@if (serverError()) {
							<div class="dialog__error" role="alert">{{ serverError() }}</div>
						}

						<footer class="dialog__footer">
							<button
										type="button"
										class="dialog__btn dialog__btn--cancel"
										(click)="close()">
								Abbrechen
							</button>
							<button
										type="submit"
										class="dialog__btn dialog__btn--submit"
										[disabled]="saving() || !hasChanges()">
								@if (saving()) {
									<span class="dialog__spinner" aria-hidden="true"></span>
									Speichern…
								} @else {
									Änderungen speichern
								}
							</button>
						</footer>
					</form>
				</div>
			</div>
    `,
    styleUrl: './create-user-dialog.component.scss',
})
export class EditUserDialogComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly api = inject(UsersApiService);
    private readonly cdr = inject(ChangeDetectorRef);

    readonly user = input.required<UserDto>();

    readonly updated = output<void>();
    readonly closed = output<void>();

    readonly saving = signal(false);
    readonly serverError = signal('');

    readonly roleOptions: Array<{ value: UserRole; label: string }> = [
        { value: 'USER', label: 'Benutzer' },
        { value: 'AUDITOR', label: 'Auditor' },
        { value: 'SECURITY', label: 'Security Officer' },
        { value: 'ADMIN', label: 'Administrator' },
    ];

    readonly form = this.fb.nonNullable.group({
        email: [
            '',
            [
                Validators.required,
                Validators.email,
            ],
        ],
        password: [
            '',
            [ Validators.minLength(8) ],
        ],
        role: [
            'USER' as UserRole,
            [ Validators.required ],
        ],
    });

    private readonly formValue = signal(this.form.getRawValue());

    readonly hasChanges = computed(() => {
        this.saving();
        const u = this.user();
        const raw = this.formValue();
        return raw.email !== u.email || raw.role !== u.role || raw.password.length > 0;
    });

    ngOnInit(): void {
        const u = this.user();
        this.form.patchValue({ email: u.email, role: u.role, password: '' });

        this.form.valueChanges.subscribe(() => {
            this.formValue.set(this.form.getRawValue());
        });
    }

    isInvalid(field: string): boolean {
        const c = this.form.get(field);
        return !!c && c.invalid && (c.dirty || c.touched);
    }

    onBackdropClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
            this.close();
        }
    }

    close(): void {
        this.closed.emit();
    }

    submit(): void {
        this.form.markAllAsTouched();
        this.serverError.set('');

        if (this.form.invalid) return;

        const raw = this.form.getRawValue();
        const u = this.user();

        const dto: UpdateUserDto = {};
        if (raw.email.trim() !== u.email) dto.email = raw.email.trim();
        if (raw.password) dto.password = raw.password;
        if (raw.role !== u.role) dto.role = raw.role;

        if (!dto.email && !dto.password && !dto.role) {
            this.close();
            return;
        }

        this.saving.set(true);

        this.api.update(u.id, dto).subscribe({
            next: () => {
                this.saving.set(false);
                this.updated.emit();
            },
            error: (err) => {
                this.saving.set(false);
                const msg = err?.error?.message;
                this.serverError.set(
                  Array.isArray(msg) ? msg.join(', ') : msg || 'Fehler beim Aktualisieren.',
                );
                this.cdr.markForCheck();
            },
        });
    }
}
