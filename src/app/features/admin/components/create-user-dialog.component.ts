import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    output,
    signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
    CreateUserDto,
    UserDto,
    UserRole,
    UsersApiService,
} from '../../../core/api/users-api.service';

@Component({
    selector: 'pb-create-user-dialog',
    imports: [ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <div
        class="dialog-backdrop"
        (click)="onBackdropClick($event)"
        (keydown.escape)="close()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-title">

        <div class="dialog" (click)="$event.stopPropagation()">
          <header class="dialog__header">
            <h2 id="create-user-title" class="dialog__title">Neuen Benutzer anlegen</h2>
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
              <label class="dialog__label" for="user-email">E-Mail *</label>
              <input
                id="user-email"
                class="dialog__input"
                formControlName="email"
                type="email"
                autocomplete="off"
                placeholder="z. B. user&#64;firma.de"
                [class.dialog__input--invalid]="isInvalid('email')"
                [attr.aria-invalid]="isInvalid('email')"
                [attr.aria-describedby]="isInvalid('email') ? 'email-err' : null" />
              @if (isInvalid('email')) {
                <div id="email-err" class="dialog__field-error" role="alert">
                  @if (form.get('email')?.hasError('required')) {
                    E-Mail ist erforderlich.
                  } @else if (form.get('email')?.hasError('email')) {
                    Ungültige E-Mail-Adresse.
                  }
                </div>
              }
            </div>

            <div class="dialog__field">
              <label class="dialog__label" for="user-password">Passwort *</label>
              <input
                id="user-password"
                class="dialog__input"
                formControlName="password"
                type="password"
                autocomplete="new-password"
                placeholder="Mindestens 8 Zeichen"
                [class.dialog__input--invalid]="isInvalid('password')"
                [attr.aria-invalid]="isInvalid('password')"
                [attr.aria-describedby]="isInvalid('password') ? 'pw-err' : null" />
              @if (isInvalid('password')) {
                <div id="pw-err" class="dialog__field-error" role="alert">
                  @if (form.get('password')?.hasError('required')) {
                    Passwort ist erforderlich.
                  } @else if (form.get('password')?.hasError('minlength')) {
                    Mindestens 8 Zeichen.
                  }
                </div>
              }
            </div>

            <div class="dialog__field">
              <label class="dialog__label" for="user-role">Rolle *</label>
              <select
                id="user-role"
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
                [disabled]="saving()">
                @if (saving()) {
                  <span class="dialog__spinner" aria-hidden="true"></span>
                  Speichern…
                } @else {
                  Benutzer anlegen
                }
              </button>
            </footer>
          </form>
        </div>
      </div>
    `,
    styleUrl: './create-user-dialog.component.scss',
})
export class CreateUserDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly api = inject(UsersApiService);
    private readonly cdr = inject(ChangeDetectorRef);

    readonly created = output<UserDto>();
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
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        role: ['USER' as UserRole, [Validators.required]],
    });

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

        this.saving.set(true);
        const raw = this.form.getRawValue();

        const dto: CreateUserDto = {
            email: raw.email.trim(),
            password: raw.password,
            role: raw.role,
        };

        this.api.create(dto).subscribe({
            next: (user) => {
                this.saving.set(false);
                this.created.emit(user);
            },
            error: (err) => {
                this.saving.set(false);
                const msg = err?.error?.message;
                this.serverError.set(
                    Array.isArray(msg) ? msg.join(', ') : msg || 'Fehler beim Erstellen des Benutzers.',
                );
                this.cdr.markForCheck();
            },
        });
    }
}

