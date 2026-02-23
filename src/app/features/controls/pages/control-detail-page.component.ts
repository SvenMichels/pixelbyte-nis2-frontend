import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, map } from 'rxjs/operators';

import {
    ControlDto,
    ControlEvidenceDto,
    ControlStatus,
    ControlsApiService,
    CreateEvidenceDto,
    EvidenceType,
    RiskDto,
} from '../../../core/api/controls-api.service';
import { ControlAuditTimelineComponent } from '../components/control-audit-timeline.component';

type UiState = 'loading' | 'ready' | 'error';

type EvidenceUiState = 'loading' | 'ready' | 'error';

const STATUS_OPTIONS: ControlStatus[] = [ 'NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'NOT_APPLICABLE' ];
const EVIDENCE_TYPES: EvidenceType[] = [ 'NOTE', 'LINK' ];

@Component({
    selector: 'pb-control-detail-page',
    imports: [ CommonModule, ReactiveFormsModule, RouterLink, ControlAuditTimelineComponent ],
    templateUrl: './control-detail-page.component.html',
    styleUrls: [ './control-detail-page.component.scss' ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlDetailPageComponent {
    private readonly api = inject(ControlsApiService);
    private readonly route = inject(ActivatedRoute);

    readonly state = signal<UiState>('loading');
    readonly evidenceState = signal<EvidenceUiState>('loading');
    readonly control = signal<ControlDto | null>(null);
    readonly evidence = signal<ControlEvidenceDto[]>([]);
    readonly errorMessage = signal<string | null>(null);
    readonly evidenceError = signal<string | null>(null);
    readonly statusUpdating = signal(false);
    readonly evidenceSubmitting = signal(false);

    readonly statusOptions = STATUS_OPTIONS;
    readonly evidenceTypes = EVIDENCE_TYPES;

    readonly selectedEvidenceType = signal<EvidenceType>('NOTE');
    readonly noteControl = new FormControl('', { nonNullable: true });
    readonly linkControl = new FormControl('', { nonNullable: true });

    private readonly controlId = toSignal(
      this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
      { initialValue: '' },
    );

    private readonly noteValue = toSignal(this.noteControl.valueChanges, { initialValue: this.noteControl.value });
    private readonly linkValue = toSignal(this.linkControl.valueChanges, { initialValue: this.linkControl.value });

    readonly canSubmitEvidence = computed(() => {
        if (this.evidenceSubmitting()) return false;
        if (this.selectedEvidenceType() === 'NOTE') {
            return this.noteValue().trim().length > 0;
        }
        return this.linkValue().trim().length > 0;
    });

    readonly linkedRisks = computed(() => this.control()?.risks ?? []);

    constructor() {
        effect(() => {
            const id = this.controlId();
            if (!id) {
                this.state.set('error');
                this.errorMessage.set('Control-ID fehlt.');
                return;
            }

            this.loadControl(id);
            this.loadEvidence(id);
        });
    }

    loadControl(id: string): void {
        this.state.set('loading');
        this.errorMessage.set(null);

        this.api
          .getById(id)
          .subscribe({
              next: (control) => {
                  this.control.set(control);
                  this.state.set('ready');
              },
              error: () => {
                  this.state.set('error');
                  this.errorMessage.set('Control konnte nicht geladen werden.');
              },
          });
    }

    loadEvidence(id: string): void {
        this.evidenceState.set('loading');
        this.evidenceError.set(null);

        this.api.getEvidence(id).subscribe({
            next: (items) => {
                this.evidence.set(Array.isArray(items) ? items : []);
                this.evidenceState.set('ready');
            },
            error: () => {
                this.evidenceState.set('error');
                this.evidenceError.set('Evidence konnte nicht geladen werden.');
            },
        });
    }

    onStatusChange(next: string): void {
        const id = this.controlId();
        const control = this.control();
        if (!id || !control) return;

        const status = next as ControlStatus;
        if (control.status === status) return;

        this.statusUpdating.set(true);
        this.errorMessage.set(null);

        this.api
          .updateStatus(id, status)
          .pipe(finalize(() => this.statusUpdating.set(false)))
          .subscribe({
              next: (updated) => this.control.set(updated),
              error: () => {
                  this.errorMessage.set('Status konnte nicht aktualisiert werden.');
              },
          });
    }

    onEvidenceTypeChange(value: string): void {
        const next = value === 'LINK' ? 'LINK' : 'NOTE';
        this.selectedEvidenceType.set(next);
        this.noteControl.setValue('');
        this.linkControl.setValue('');
        this.evidenceError.set(null);
    }

    submitEvidence(): void {
        const id = this.controlId();
        if (!id) return;

        const type = this.selectedEvidenceType();
        const payload: CreateEvidenceDto = {
            type,
            note: type === 'NOTE' ? this.noteControl.value.trim() : undefined,
            link: type === 'LINK' ? this.linkControl.value.trim() : undefined,
        };

        if (type === 'NOTE' && !payload.note) {
            this.evidenceError.set('Bitte eine Notiz eingeben.');
            return;
        }

        if (type === 'LINK' && !payload.link) {
            this.evidenceError.set('Bitte einen Link eingeben.');
            return;
        }

        this.evidenceSubmitting.set(true);
        this.evidenceError.set(null);

        this.api
          .addEvidence(id, payload)
          .pipe(finalize(() => this.evidenceSubmitting.set(false)))
          .subscribe({
              next: (created) => {
                  this.evidence.update((items) => [ created, ...items ]);
                  this.noteControl.setValue('');
                  this.linkControl.setValue('');
              },
              error: () => {
                  this.evidenceError.set('Evidence konnte nicht gespeichert werden.');
              },
          });
    }

    deleteEvidence(evidenceId: string): void {
        const id = this.controlId();
        if (!id) return;

        this.api.deleteEvidence(id, evidenceId).subscribe({
            next: () => {
                this.evidence.update((items) => items.filter((item) => item.id !== evidenceId));
            },
            error: () => {
                this.evidenceError.set('Evidence konnte nicht entfernt werden.');
            },
        });
    }

    deleteAllEvidence(): void {
        const id = this.controlId();
        if (!id) return;

        this.api.deleteEvidenceBulk(id).subscribe({
            next: () => this.evidence.set([]),
            error: () => {
                this.evidenceError.set('Evidences konnten nicht entfernt werden.');
            },
        });
    }

    trackEvidence = (_: number, item: ControlEvidenceDto) => item.id;

    trackRisk = (_: number, item: { riskId: string }) => item.riskId;

    riskScore(risk: RiskDto): string {
        return `S${risk.severity} / L${risk.likelihood} / I${risk.impact}`;
    }
}
