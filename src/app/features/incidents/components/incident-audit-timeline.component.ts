import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import {
    IncidentAuditEventDto,
    IncidentAuditEventsResponse,
    IncidentsApiService,
} from '../../../core/api/incidents-api.service';

type UiState = 'loading' | 'ready' | 'empty' | 'error' | 'idle';

type AuditView = {
    badge: string;
    title: string;
    details?: string;
};

@Component({
    selector: 'pb-incident-audit-timeline',
    imports: [CommonModule],
    templateUrl: './incident-audit-timeline.component.html',
    styleUrl: './incident-audit-timeline.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentAuditTimelineComponent {
    private readonly api = inject(IncidentsApiService);

    readonly incidentId = input.required<string>();
    readonly active = input(false);

    readonly state = signal<UiState>('idle');
    readonly events = signal<IncidentAuditEventDto[]>([]);
    readonly loadingMore = signal(false);
    readonly nextCursor = signal<string | null>(null);

    readonly hasMore = computed(() => !!this.nextCursor());

    private loadedForId: string | null = null;
    private loading = false;
    private readonly pageSize = 25;

    constructor() {
        effect(() => {
            const id = this.incidentId();
            const active = this.active();

            if (this.loadedForId !== null && this.loadedForId !== id) {
                this.loadedForId = null;
                this.events.set([]);
                this.nextCursor.set(null);
                this.state.set(active ? 'loading' : 'idle');
            }

            if (active) {
                this.loadIfNeeded(id, active);
            }
        });
    }

    private loadIfNeeded(incidentId: string, active: boolean): void {
        if (!incidentId || !active || this.loading) return;

        if (this.loadedForId === incidentId) {
            const list = this.events();
            this.state.set(list.length ? 'ready' : 'empty');
            return;
        }

        this.load(incidentId);
    }

    private load(incidentId: string): void {
        this.loading = true;
        this.state.set('loading');
        this.events.set([]);
        this.nextCursor.set(null);

        this.api
            .getAuditEvents(incidentId, this.pageSize)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: (res: IncidentAuditEventsResponse) => {
                    const list = Array.isArray(res?.items) ? res.items : [];
                    this.events.set(list);
                    this.nextCursor.set(res?.nextCursor ?? null);
                    this.loadedForId = incidentId;
                    this.state.set(list.length ? 'ready' : 'empty');
                },
                error: () => {
                    this.state.set('error');
                },
            });
    }

    loadMore(): void {
        if (!this.hasMore() || this.loadingMore()) return;

        const id = this.incidentId();
        const cursor = this.nextCursor();
        if (!id || !cursor) return;

        this.loadingMore.set(true);
        this.api
            .getAuditEvents(id, this.pageSize, cursor)
            .pipe(finalize(() => this.loadingMore.set(false)))
            .subscribe({
                next: (res: IncidentAuditEventsResponse) => {
                    const list = Array.isArray(res?.items) ? res.items : [];
                    this.events.update((curr) => [...curr, ...list]);
                    this.nextCursor.set(res?.nextCursor ?? null);
                },
                error: () => {},
            });
    }

    private asRecord(value: unknown): Record<string, unknown> {
        return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
    }

    private asString(value: unknown): string | undefined {
        return typeof value === 'string' ? value : undefined;
    }

    private asNestedRecord(value: unknown, key: string): Record<string, unknown> {
        return this.asRecord(this.asRecord(value)[key]);
    }

    view(e: IncidentAuditEventDto): AuditView {
        const meta = this.asRecord(e.meta ?? {});
        const badge = this.badge(e.action);

        if (e.action === 'CREATED') {
            const snap = this.asNestedRecord(meta, 'snapshot');
            const title = this.asString(snap['title']) ?? 'Vorfall';
            return { badge, title: `Vorfall gemeldet: ${title}` };
        }

        if (e.action === 'STATUS_CHANGED') {
            const changes = this.asNestedRecord(meta, 'changes');
            const status = this.asNestedRecord(changes, 'status');
            const from = this.asString(status['from']);
            const to = this.asString(status['to']);
            return { badge, title: from && to ? `Status: ${from} → ${to}` : 'Status geändert' };
        }

        if (e.action === 'INCIDENT_REPORTED') {
            const type = this.asString(meta['reportType']);
            return { badge, title: type ? `Meldung: ${type}` : 'Vorfall gemeldet' };
        }

        if (e.action === 'INCIDENT_RESOLVED') {
            return { badge, title: 'Vorfall behoben' };
        }

        if (e.action === 'UPDATED') {
            const changes = this.asRecord(meta['changes']);
            const fields = Object.keys(changes);
            if (fields.length > 0) {
                return { badge, title: `Aktualisiert: ${fields.join(', ')}` };
            }
            return { badge, title: 'Aktualisiert' };
        }

        return { badge, title: `${e.entityType}: ${e.action}` };
    }

    actorLabel(e: IncidentAuditEventDto): string {
        const actor = e.actor;
        if (!actor?.email) return 'Unbekannt';
        return actor.role ? `${actor.email} (${actor.role})` : actor.email;
    }

    badge(action: string): string {
        const map: Record<string, string> = {
            CREATED: 'NEU',
            STATUS_CHANGED: 'STATUS',
            UPDATED: 'UPDATE',
            INCIDENT_REPORTED: 'MELDUNG',
            INCIDENT_RESOLVED: 'BEHOBEN',
        };
        return map[action] ?? action;
    }

    trackById = (_: number, e: IncidentAuditEventDto) => e.id;
}

