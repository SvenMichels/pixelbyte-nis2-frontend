import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { AuditEventsResponse, ControlAuditEventDto, ControlsApiService } from '../../../core/api/controls-api.service';

type UiState = 'loading' | 'ready' | 'empty' | 'error' | 'idle';

type AuditView = {
    badge: string;
    title: string;
    details?: string;
    link?: string;
};

@Component({
    selector: 'pb-control-audit-timeline',
    imports: [ CommonModule ],
    templateUrl: './control-audit-timeline.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlAuditTimelineComponent {
    readonly controlId = input.required<string>();
    readonly active = input(false);

    readonly state = signal<UiState>('idle');
    readonly events = signal<ControlAuditEventDto[]>([]);
    readonly loadingMore = signal(false);
    readonly nextCursor = signal<string | null>(null);

    readonly hasMore = computed(() => !!this.nextCursor());

    private readonly api = inject(ControlsApiService);

    private loadedForControlId: string | null = null;
    private loading = false;
    private readonly pageSize = 25;

    constructor() {
        effect(() => {
            const id = this.controlId();
            const active = this.active();

            if (this.loadedForControlId !== null && this.loadedForControlId !== id) {
                this.loadedForControlId = null;
                this.events.set([]);
                this.nextCursor.set(null);
                this.state.set(active ? 'loading' : 'idle');
            }

            if (active) {
                this.loadIfNeeded(id, active);
            }
        });
    }

    private loadIfNeeded(controlId: string, active: boolean): void {
        if (!controlId) return;
        if (!active) return;
        if (this.loading) return;

        if (this.loadedForControlId === controlId) {
            const list = this.events();
            this.state.set(list.length ? 'ready' : 'empty');
            return;
        }

        this.load(controlId);
    }

    private load(controlId: string): void {
        if (!controlId) return;

        this.loading = true;
        this.state.set('loading');
        this.events.set([]);
        this.nextCursor.set(null);

        this.api
          .getAuditEventsForControl(controlId, this.pageSize)
          .pipe(finalize(() => (this.loading = false)))
          .subscribe({
              next: (res: AuditEventsResponse) => {
                  const list = Array.isArray(res?.items) ? res.items : [];
                  this.events.set(list);
                  this.nextCursor.set(res?.nextCursor ?? null);
                  this.loadedForControlId = controlId;
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

        const controlId = this.controlId();
        const cursor = this.nextCursor();
        if (!controlId || !cursor) return;

        this.loadingMore.set(true);

        this.api
          .getAuditEventsForControl(controlId, this.pageSize, cursor)
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

    view(e: ControlAuditEventDto): AuditView {
        const meta = this.asRecord(e.meta ?? {});
        const badge = this.badge(e.action);

        if (e.action === 'CREATED' && e.entityType === 'CONTROL') {
            const snap = this.asNestedRecord(meta, 'snapshot');
            const code = this.asString(snap['code']) ?? '';
            const title = this.asString(snap['title']) ?? 'Control';
            const status = this.asString(snap['status']);
            return { badge, title: `Control erstellt: ${code} – ${title}${status ? ` (${status})` : ''}` };
        }

        if (e.action === 'STATUS_CHANGED' && e.entityType === 'CONTROL') {
            const changes = this.asNestedRecord(meta, 'changes');
            const status = this.asNestedRecord(changes, 'status');
            const from = this.asString(status['from']);
            const to = this.asString(status['to']);
            return { badge, title: from && to ? `Status geändert: ${from} → ${to}` : 'Status geändert' };
        }

        if (e.action === 'EVIDENCE_CREATED' && e.entityType === 'EVIDENCE') {
            const snap = this.asNestedRecord(meta, 'snapshot');
            const type = this.asString(snap['type']);
            const note = this.asString(snap['note']);
            const link = this.asString(snap['link']);
            if (type === 'NOTE') return { badge, title: 'Evidence hinzugefügt: Notiz', details: note };
            if (type === 'LINK') return { badge, title: 'Evidence hinzugefügt: Link', link };
            return { badge, title: 'Evidence hinzugefügt' };
        }

        if (e.action === 'EVIDENCE_DELETED' && e.entityType === 'EVIDENCE') {
            const bulk = meta['bulk'] === true;
            if (bulk) {
                const count = typeof meta['deletedCount'] === 'number' ? meta['deletedCount'] : '?';
                return { badge, title: 'Evidences gelöscht (bulk)', details: `Anzahl: ${count}` };
            }

            const snap = this.asNestedRecord(meta, 'snapshot');
            const type = this.asString(snap['type']);
            const note = this.asString(snap['note']);
            const link = this.asString(snap['link']);
            if (type === 'NOTE') return { badge, title: 'Evidence gelöscht: Notiz', details: note };
            if (type === 'LINK') return { badge, title: 'Evidence gelöscht: Link', link };
            return { badge, title: 'Evidence gelöscht' };
        }

        return { badge, title: `${e.entityType}: ${e.action}` };
    }

    actorLabel(e: ControlAuditEventDto): string {
        const actor = e.actor;
        if (!actor?.email) return 'Unbekannt';
        return actor.role ? `${actor.email} (${actor.role})` : actor.email;
    }

    badge(action: ControlAuditEventDto['action']): string {
        if (action === 'STATUS_CHANGED') return 'STATUS';
        if (action === 'EVIDENCE_CREATED') return 'EVID+';
        if (action === 'EVIDENCE_DELETED') return 'EVID-';
        if (action === 'CREATED') return 'NEW';
        return action;
    }

    trackById = (_: number, e: ControlAuditEventDto) => e.id;
}
