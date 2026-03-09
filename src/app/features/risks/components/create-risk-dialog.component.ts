import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    output,
    signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CreateRiskDto, RiskDto, RisksApiService } from '../../../core/api/risks-api.service';

@Component({
    selector: 'pb-create-risk-dialog',
    imports: [ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <div
        class="dialog-backdrop"
        (click)="onBackdropClick($event)"
        (keydown.escape)="close()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-risk-title">

        <div class="dialog" (click)="$event.stopPropagation()">
          <header class="dialog__header">
            <h2 id="create-risk-title" class="dialog__title">Neues Risiko erstellen</h2>
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
              <label class="dialog__label" for="risk-title">Titel *</label>
              <input
                id="risk-title"
                class="dialog__input"
                formControlName="title"
                type="text"
                placeholder="z. B. Ransomware-Angriff auf Kernsysteme"
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
              <label class="dialog__label" for="risk-desc">Beschreibung</label>
              <textarea
                id="risk-desc"
                class="dialog__input dialog__input--textarea"
                formControlName="description"
                rows="3"
                placeholder="Optionale Beschreibung des Risikos…"></textarea>
            </div>

            <div class="dialog__row">
              <div class="dialog__field">
                <label class="dialog__label" for="risk-severity">Schweregrad (1–5)</label>
                <input
                  id="risk-severity"
                  class="dialog__input"
                  formControlName="severity"
                  type="number"
                  min="1" max="5"
                  [class.dialog__input--invalid]="isInvalid('severity')" />
                @if (isInvalid('severity')) {
                  <div class="dialog__field-error" role="alert">Wert zwischen 1 und 5.</div>
                }
              </div>

              <div class="dialog__field">
                <label class="dialog__label" for="risk-likelihood">Eintrittswahrscheinlichkeit (1–5)</label>
                <input
                  id="risk-likelihood"
                  class="dialog__input"
                  formControlName="likelihood"
                  type="number"
                  min="1" max="5"
                  [class.dialog__input--invalid]="isInvalid('likelihood')" />
                @if (isInvalid('likelihood')) {
                  <div class="dialog__field-error" role="alert">Wert zwischen 1 und 5.</div>
                }
              </div>

              <div class="dialog__field">
                <label class="dialog__label" for="risk-impact">Auswirkung (1–5)</label>
                <input
                  id="risk-impact"
                  class="dialog__input"
                  formControlName="impact"
                  type="number"
                  min="1" max="5"
                  [class.dialog__input--invalid]="isInvalid('impact')" />
                @if (isInvalid('impact')) {
                  <div class="dialog__field-error" role="alert">Wert zwischen 1 und 5.</div>
                }
              </div>
            </div>

            <div class="dialog__preview">
              <span class="dialog__preview-label">Vorschau Risk Score:</span>
              <span class="dialog__preview-score" [attr.data-level]="previewLevel()">
                {{ previewScore() }}
              </span>
              <span class="dialog__preview-level">{{ previewLevel().toUpperCase() }}</span>
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
                  Risiko erstellen
                }
              </button>
            </footer>
          </form>
        </div>
      </div>
    `,
    styleUrl: './create-risk-dialog.component.scss',
})
export class CreateRiskDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly api = inject(RisksApiService);
    private readonly cdr = inject(ChangeDetectorRef);

    readonly created = output<RiskDto>();
    readonly closed = output<void>();

    readonly saving = signal(false);
    readonly serverError = signal('');

    readonly form = this.fb.nonNullable.group({
        title: ['', [Validators.required, Validators.minLength(3)]],
        description: [''],
        severity: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
        likelihood: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
        impact: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    });

    previewScore(): number {
        const s = this.form.get('severity')?.value ?? 1;
        const l = this.form.get('likelihood')?.value ?? 1;
        return s * l;
    }

    previewLevel(): string {
        return this.api.getRiskLevel(this.previewScore());
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

        if (this.form.invalid) {
            return;
        }

        this.saving.set(true);
        const raw = this.form.getRawValue();

        const dto: CreateRiskDto = {
            title: raw.title.trim(),
            description: raw.description?.trim() || undefined,
            severity: raw.severity,
            likelihood: raw.likelihood,
            impact: raw.impact,
        };

        this.api.create(dto).subscribe({
            next: (risk) => {
                this.saving.set(false);
                this.created.emit(risk);
            },
            error: (err) => {
                this.saving.set(false);
                this.serverError.set(this.extractError(err));
                this.cdr.markForCheck();
            },
        });
    }

    private extractError(err: unknown): string {
        const httpErr = err as { status?: number; error?: { message?: string | string[] } };

        if (httpErr.error?.message) {
            const msg = httpErr.error.message;
            return Array.isArray(msg) ? msg.join(' ') : msg;
        }

        if (httpErr.status === 403) {
            return 'Sie haben keine Berechtigung, Risiken zu erstellen.';
        }

        return 'Risiko konnte nicht erstellt werden. Bitte versuchen Sie es erneut.';
    }
}

