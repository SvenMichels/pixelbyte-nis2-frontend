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
    CreateIncidentDto,
    IncidentDto,
    IncidentSeverity,
    IncidentsApiService,
} from '../../../core/api/incidents-api.service';

@Component({
    selector: 'pb-create-incident-dialog',
    imports: [ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <div
        class="dialog-backdrop"
        (click)="onBackdropClick($event)"
        (keydown.escape)="close()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-incident-title">

        <div class="dialog" (click)="$event.stopPropagation()">
          <header class="dialog__header">
            <h2 id="create-incident-title" class="dialog__title">Neuen Vorfall melden</h2>
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
              <label class="dialog__label" for="incident-title">Titel *</label>
              <input
                id="incident-title"
                class="dialog__input"
                formControlName="title"
                type="text"
                placeholder="z. B. Ransomware auf Dateiserver"
                [class.dialog__input--invalid]="isInvalid('title')"
                [attr.aria-invalid]="isInvalid('title')"
                [attr.aria-describedby]="isInvalid('title') ? 'title-err' : null" />
              @if (isInvalid('title')) {
                <div id="title-err" class="dialog__field-error" role="alert">
                  @if (form.get('title')?.hasError('required')) {
                    Titel ist erforderlich.
                  } @else if (form.get('title')?.hasError('minlength')) {
                    Mindestens 3 Zeichen.
                  }
                </div>
              }
            </div>

            <div class="dialog__field">
              <label class="dialog__label" for="incident-desc">Beschreibung</label>
              <textarea
                id="incident-desc"
                class="dialog__input dialog__input--textarea"
                formControlName="description"
                rows="4"
                placeholder="Was ist passiert? Welche Systeme sind betroffen?"></textarea>
            </div>

            <div class="dialog__field">
              <label class="dialog__label" for="incident-severity">Schweregrad *</label>
              <select
                id="incident-severity"
                class="dialog__input"
                formControlName="severity"
                [class.dialog__input--invalid]="isInvalid('severity')">
                @for (opt of severityOptions; track opt.value) {
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
                  Vorfall melden
                }
              </button>
            </footer>
          </form>
        </div>
      </div>
    `,
    styleUrl: './create-incident-dialog.component.scss',
})
export class CreateIncidentDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly api = inject(IncidentsApiService);
    private readonly cdr = inject(ChangeDetectorRef);

    readonly created = output<IncidentDto>();
    readonly closed = output<void>();

    readonly saving = signal(false);
    readonly serverError = signal('');

    readonly severityOptions: Array<{ value: IncidentSeverity; label: string }> = [
        { value: 'LOW', label: 'Niedrig' },
        { value: 'MEDIUM', label: 'Mittel' },
        { value: 'HIGH', label: 'Hoch' },
        { value: 'CRITICAL', label: 'Kritisch' },
    ];

    readonly form = this.fb.nonNullable.group({
        title: ['', [Validators.required, Validators.minLength(3)]],
        description: [''],
        severity: ['MEDIUM' as IncidentSeverity, [Validators.required]],
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

        const dto: CreateIncidentDto = {
            title: raw.title.trim(),
            description: raw.description.trim() || undefined,
            severity: raw.severity,
        };

        this.api.create(dto).subscribe({
            next: (incident) => {
                this.saving.set(false);
                this.created.emit(incident);
            },
            error: (err) => {
                this.saving.set(false);
                const msg = err?.error?.message;
                this.serverError.set(
                    Array.isArray(msg) ? msg.join(', ') : msg || 'Fehler beim Erstellen des Vorfalls.',
                );
                this.cdr.markForCheck();
            },
        });
    }
}

