import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { AuditEventsResponse, RiskAuditEventDto, RisksApiService } from '../../../core/api/risks-api.service';

type UiState = 'loading' | 'ready' | 'empty' | 'error' | 'idle';

type AuditView = {
  badge: string;
  title: string;
  details?: string;
};

@Component({
  selector: 'pb-risk-audit-timeline',
  imports: [CommonModule],
  templateUrl: './risk-audit-timeline.component.html',
  styleUrl: './risk-audit-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskAuditTimelineComponent {
  private readonly api = inject(RisksApiService);

  readonly riskId = input.required<string>();
  readonly active = input(false);

  readonly state = signal<UiState>('idle');
  readonly events = signal<RiskAuditEventDto[]>([]);
  readonly loadingMore = signal(false);
  readonly nextCursor = signal<string | null>(null);

  readonly hasMore = computed(() => !!this.nextCursor());

  private loadedForRiskId: string | null = null;
  private loading = false;
  private readonly pageSize = 25;

  constructor() {
    effect(() => {
      const id = this.riskId();
      const active = this.active();

      if (this.loadedForRiskId !== null && this.loadedForRiskId !== id) {
        this.loadedForRiskId = null;
        this.events.set([]);
        this.nextCursor.set(null);
        this.state.set(active ? 'loading' : 'idle');
      }

      if (active) {
        this.loadIfNeeded(id, active);
      }
    });
  }

  private loadIfNeeded(riskId: string, active: boolean): void {
    if (!riskId) return;
    if (!active) return;
    if (this.loading) return;

    if (this.loadedForRiskId === riskId) {
      const list = this.events();
      this.state.set(list.length ? 'ready' : 'empty');
      return;
    }

    this.load(riskId);
  }

  private load(riskId: string): void {
    if (!riskId) return;

    this.loading = true;
    this.state.set('loading');
    this.events.set([]);
    this.nextCursor.set(null);

    this.api
      .getAuditEventsForRisk(riskId, this.pageSize)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: AuditEventsResponse) => {
          const list = Array.isArray(res?.items) ? res.items : [];
          this.events.set(list);
          this.nextCursor.set(res?.nextCursor ?? null);
          this.loadedForRiskId = riskId;
          this.state.set(list.length ? 'ready' : 'empty');
        },
        error: () => {
          this.state.set('error');
        },
      });
  }

  loadMore(): void {
    if (!this.hasMore()) return;
    if (this.loadingMore()) return;

    const riskId = this.riskId();
    const cursor = this.nextCursor();
    if (!riskId || !cursor) return;

    this.loadingMore.set(true);

    this.api
      .getAuditEventsForRisk(riskId, this.pageSize, cursor)
      .pipe(finalize(() => this.loadingMore.set(false)))
      .subscribe({
        next: (res: AuditEventsResponse) => {
          const list = Array.isArray(res?.items) ? res.items : [];
          this.events.update((curr) => [ ...curr, ...list ]);
          this.nextCursor.set(res?.nextCursor ?? null);
        },
        error: () => {},
      });
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private asNestedRecord(value: unknown, key: string): Record<string, unknown> {
    const base = this.asRecord(value);
    return this.asRecord(base[key]);
  }

  view(e: RiskAuditEventDto): AuditView {
    const meta = this.asRecord(e.meta ?? {});
    const badge = this.badge(e.action);

    if (e.action === 'CREATED' && e.entityType === 'RISK') {
      const snap = this.asNestedRecord(meta, 'snapshot');
      const title = this.asString(snap['title']) ?? 'Risk';
      const status = this.asString(snap['status']);
      return { badge, title: `Risk erstellt: ${title}${status ? ` (${status})` : ''}` };
    }

    if (e.action === 'STATUS_CHANGED' && e.entityType === 'RISK') {
      const changes = this.asNestedRecord(meta, 'changes');
      const status = this.asNestedRecord(changes, 'status');
      const from = this.asString(status['from']);
      const to = this.asString(status['to']);
      return { badge, title: from && to ? `Status geändert: ${from} → ${to}` : 'Status geändert' };
    }

    if (e.action === 'UPDATED' && e.entityType === 'RISK') {
      const changes = this.asRecord(meta['changes']);
      const fields = Object.keys(changes);
      if (fields.length > 0) {
        return { badge, title: `Aktualisiert: ${fields.join(', ')}`, details: JSON.stringify(changes, null, 2) };
      }
      return { badge, title: 'Aktualisiert' };
    }

    return { badge, title: `${e.entityType}: ${e.action}` };
  }

  actorLabel(e: RiskAuditEventDto): string {
    const actor = e.actor;
    if (!actor?.email) return 'Unbekannt';
    return actor.role ? `${actor.email} (${actor.role})` : actor.email;
  }

  badge(action: RiskAuditEventDto['action']): string {
    if (action === 'STATUS_CHANGED') return 'STATUS';
    if (action === 'UPDATED') return 'UPDATE';
    if (action === 'CREATED') return 'NEW';
    return action;
  }

  trackById = (_: number, e: RiskAuditEventDto) => e.id;
}

