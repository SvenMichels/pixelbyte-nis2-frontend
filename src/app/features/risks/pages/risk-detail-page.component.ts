import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, map } from 'rxjs/operators';

import { ControlDto, ControlsApiService } from '../../../core/api/controls-api.service';
import { RiskDto, RiskStatus, RisksApiService } from '../../../core/api/risks-api.service';
import { RiskAuditTimelineComponent } from '../components/risk-audit-timeline.component';

type UiState = 'loading' | 'ready' | 'error';

const STATUS_OPTIONS: RiskStatus[] = [ 'IDENTIFIED', 'ASSESSED', 'MITIGATED', 'ACCEPTED', 'CLOSED' ];

@Component({
  selector: 'pb-risk-detail-page',
  imports: [ CommonModule, ReactiveFormsModule, RouterLink, RiskAuditTimelineComponent ],
  templateUrl: './risk-detail-page.component.html',
  styleUrls: [ './risk-detail-page.component.scss' ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskDetailPageComponent {
  private readonly api = inject(RisksApiService);
  private readonly controlsApi = inject(ControlsApiService);
  private readonly route = inject(ActivatedRoute);

  readonly state = signal<UiState>('loading');
  readonly risk = signal<RiskDto | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly statusUpdating = signal(false);

  readonly controlsState = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly availableControls = signal<ControlDto[]>([]);
  readonly linkError = signal<string | null>(null);
  readonly linkLoading = signal(false);
  readonly unlinkLoadingId = signal<string | null>(null);

  readonly statusOptions = STATUS_OPTIONS;

  readonly controlSearch = new FormControl('', { nonNullable: true });
  private readonly searchValue = toSignal(this.controlSearch.valueChanges, { initialValue: this.controlSearch.value });

  private readonly riskId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  readonly linkedControls = computed(() => this.risk()?.controls ?? []);
  readonly linkedControlIds = computed(() => new Set((this.risk()?.controls ?? []).map((link) => link.controlId)));

  constructor() {
    effect(() => {
      const id = this.riskId();
      if (!id) {
        this.state.set('error');
        this.errorMessage.set('Risk-ID fehlt.');
        return;
      }

      this.loadRisk(id);
    });

    effect(() => {
      const value = this.searchValue().trim();
      this.updateControlSearch(value);
    });
  }

  loadRisk(id: string): void {
    this.state.set('loading');
    this.errorMessage.set(null);

    this.api.findOne(id).subscribe({
      next: (risk) => {
        this.risk.set(risk);
        this.state.set('ready');
      },
      error: () => {
        this.state.set('error');
        this.errorMessage.set('Risk konnte nicht geladen werden.');
      },
    });
  }

  updateControlSearch(value: string): void {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      this.availableControls.set([]);
      this.controlsState.set('idle');
      return;
    }

    this.controlsState.set('loading');

    this.controlsApi
      .getAll({ take: 10, search: trimmed, sortKey: 'code', sortDir: 'asc' })
      .subscribe({
        next: (res) => {
          const linkedIds = this.linkedControlIds();
          const list = Array.isArray(res.items) ? res.items : [];
          this.availableControls.set(list.filter((item) => !linkedIds.has(item.id)));
          this.controlsState.set('ready');
        },
        error: () => {
          this.controlsState.set('error');
        },
      });
  }

  linkControl(controlId: string): void {
    const id = this.riskId();
    if (!id) return;

    this.linkLoading.set(true);
    this.linkError.set(null);

    this.api
      .linkControl(id, controlId)
      .pipe(finalize(() => this.linkLoading.set(false)))
      .subscribe({
        next: () => {
          this.loadRisk(id);
          this.controlSearch.setValue('');
          this.availableControls.set([]);
          this.controlsState.set('idle');
        },
        error: () => {
          this.linkError.set('Control konnte nicht verknüpft werden.');
        },
      });
  }

  unlinkControl(controlId: string): void {
    const id = this.riskId();
    if (!id) return;

    this.unlinkLoadingId.set(controlId);
    this.linkError.set(null);

    this.api
      .unlinkControl(id, controlId)
      .pipe(finalize(() => this.unlinkLoadingId.set(null)))
      .subscribe({
        next: () => this.loadRisk(id),
        error: () => {
          this.linkError.set('Control konnte nicht entfernt werden.');
        },
      });
  }

  onStatusChange(next: string): void {
    const id = this.riskId();
    const risk = this.risk();
    if (!id || !risk) return;

    const status = next as RiskStatus;
    if (risk.status === status) return;

    this.statusUpdating.set(true);
    this.errorMessage.set(null);

    this.api
      .updateStatus(id, { status })
      .pipe(finalize(() => this.statusUpdating.set(false)))
      .subscribe({
        next: (updated) => this.risk.set(updated),
        error: () => {
          this.errorMessage.set('Status konnte nicht aktualisiert werden.');
        },
      });
  }

  riskScore(risk: RiskDto): number {
    return this.api.calculateRiskScore(risk);
  }

  riskLevel(risk: RiskDto): string {
    return this.api.getRiskLevel(this.riskScore(risk));
  }

  trackControl = (_: number, item: { controlId: string }) => item.controlId;

  trackAvailableControl = (_: number, item: ControlDto) => item.id;
}
