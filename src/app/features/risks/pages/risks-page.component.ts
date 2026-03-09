import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RiskDto, RiskStatus, RisksApiService } from '../../../core/api/risks-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CreateRiskDialogComponent } from '../components/create-risk-dialog.component';
import { RiskAuditTimelineComponent } from '../components/risk-audit-timeline.component';

type UiState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'pb-risks-page',
  imports: [CommonModule, RouterLink, RiskAuditTimelineComponent, CreateRiskDialogComponent],
  templateUrl: './risks-page.component.html',
  styleUrl: './risks-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RisksPageComponent implements OnInit {
  private readonly api = inject(RisksApiService);
  private readonly auth = inject(AuthService);

  readonly state = signal<UiState>('loading');
  readonly risks = signal<RiskDto[]>([]);
  readonly auditOpen = signal<Record<string, boolean>>({});
  readonly showCreateDialog = signal(false);

  readonly canCreate = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'ADMIN' || role === 'SECURITY';
  });

  readonly searchQuery = signal('');
  readonly statusFilter = signal<RiskStatus | ''>('');
  readonly levelFilter = signal<'low' | 'medium' | 'high' | 'critical' | ''>('');
  readonly minScore = signal('');
  readonly maxScore = signal('');
  readonly sortKey = signal<'score' | 'title' | 'status'>('score');
  readonly sortDir = signal<'desc' | 'asc'>('desc');

  readonly statusOptions: RiskStatus[] = [ 'IDENTIFIED', 'ASSESSED', 'MITIGATED', 'ACCEPTED', 'CLOSED' ];

  readonly filteredRisks = computed(() => {
    const search = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const level = this.levelFilter();
    const min = this.parseNumber(this.minScore());
    const max = this.parseNumber(this.maxScore());

    const filtered = this.risks().filter((risk) => {
      if (status && risk.status !== status) return false;
      if (level && this.getRiskLevel(risk) !== level) return false;

      const score = this.calculateScore(risk);
      if (min !== null && score < min) return false;
      if (max !== null && score > max) return false;

      if (search) {
        const hay = `${risk.title} ${risk.description ?? ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }

      return true;
    });

    return this.sortRisks(filtered);
  });

  // Computed statistics
  readonly totalRisks = computed(() => this.filteredRisks().length);

  readonly criticalRisks = computed(() =>
    this.filteredRisks().filter(r => this.getRiskLevel(r) === 'critical').length
  );

  readonly highRisks = computed(() =>
    this.filteredRisks().filter(r => this.getRiskLevel(r) === 'high').length
  );

  readonly mediumRisks = computed(() =>
    this.filteredRisks().filter(r => this.getRiskLevel(r) === 'medium').length
  );

  readonly openRisks = computed(() =>
    this.filteredRisks().filter(r => r.status !== 'CLOSED' && r.status !== 'ACCEPTED').length
  );

  ngOnInit(): void {
    if (!this.auth.isAuthenticated() || !this.auth.currentUser()) {
      return;
    }

    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.api.getAll(this.buildQuery()).subscribe({
      next: (data) => {
        this.risks.set(data);
        this.state.set('ready');
      },
      error: () => {
        this.state.set('error');
      },
    });
  }

  isAuditOpen(id: string): boolean {
    return !!this.auditOpen()[id];
  }

  toggleAudit(id: string): void {
    this.auditOpen.update((m) => ({ ...m, [id]: !m[id] }));
  }

  calculateScore(risk: RiskDto): number {
    return this.api.calculateRiskScore(risk);
  }

  getRiskLevel(risk: RiskDto): string {
    const score = this.calculateScore(risk);
    return this.api.getRiskLevel(score);
  }

  getStatusLabel(status: string): string {
    return this.api.getStatusLabel(status as RiskStatus);
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
    this.load();
  }

  updateStatusFilter(value: string): void {
    const next = this.statusOptions.includes(value as RiskStatus) ? (value as RiskStatus) : '';
    this.statusFilter.set(next);
    this.load();
  }

  updateLevelFilter(value: string): void {
    const next = value === 'low' || value === 'medium' || value === 'high' || value === 'critical' ? value : '';
    this.levelFilter.set(next);
    this.load();
  }

  updateMinScore(value: string): void {
    this.minScore.set(value);
    this.load();
  }

  updateMaxScore(value: string): void {
    this.maxScore.set(value);
    this.load();
  }

  updateSortKey(value: string): void {
    const next = value === 'title' || value === 'status' ? value : 'score';
    this.sortKey.set(next);
    this.load();
  }

  updateSortDir(value: string): void {
    this.sortDir.set(value === 'asc' ? 'asc' : 'desc');
    this.load();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.levelFilter.set('');
    this.minScore.set('');
    this.maxScore.set('');
    this.sortKey.set('score');
    this.sortDir.set('desc');
    this.load();
  }

  private parseNumber(value: string): number | null {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private sortRisks(list: RiskDto[]): RiskDto[] {
    const key = this.sortKey();
    const dir = this.sortDir();
    const order = dir === 'asc' ? 1 : -1;

    return [ ...list ].sort((a, b) => {
      let cmp = 0;
      if (key === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (key === 'status') {
        cmp = a.status.localeCompare(b.status);
      } else {
        cmp = this.calculateScore(a) - this.calculateScore(b);
      }
      return cmp * order;
    });
  }

  private buildQuery() {
    return {
      search: this.searchQuery().trim() || undefined,
      status: this.statusFilter() || undefined,
      level: this.levelFilter() || undefined,
      minScore: this.parseNumber(this.minScore()) ?? undefined,
      maxScore: this.parseNumber(this.maxScore()) ?? undefined,
      sortKey: this.sortKey(),
      sortDir: this.sortDir(),
    };
  }

  trackById = (_: number, risk: RiskDto) => risk.id;

  openCreateDialog(): void {
    if (!this.canCreate()) return;
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
  }

  onRiskCreated(_risk: RiskDto): void {
    this.showCreateDialog.set(false);
    this.load();
  }
}

