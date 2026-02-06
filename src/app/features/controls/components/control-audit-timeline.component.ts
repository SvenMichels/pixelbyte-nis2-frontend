import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { ControlAuditEventDto, ControlsApiService } from '../../../core/api/controls-api.service';

type UiState = 'loading' | 'ready' | 'empty' | 'error';

type AuditView = {
    badge: string;
    title: string;
    details?: string;
    link?: string;
};

@Component({
    selector: 'pb-control-audit-timeline',
    standalone: true,
    imports: [ CommonModule ],
    templateUrl: './control-audit-timeline.component.html',
})
export class ControlAuditTimelineComponent implements OnChanges {
    @Input({ required: true }) controlId!: string;

    readonly state = signal<UiState>('loading');
    readonly events = signal<ControlAuditEventDto[]>([]);

    constructor(private readonly api: ControlsApiService) {
    }

    ngOnChanges(): void {
        this.load();
    }

    load(): void {
        if (!this.controlId) return;

        this.state.set('loading');
        this.events.set([]);

        this.api
          .getAuditForControl(this.controlId)
          .pipe(finalize(() => {
          }))
          .subscribe({
              next: (res: ControlAuditEventDto[]) => {
                  const list = Array.isArray(res) ? res : [];
                  this.events.set(list);
                  this.state.set(list.length ? 'ready' : 'empty');
              },
              error: (err: unknown) => {
                  console.error('[audit] error', err);
                  this.state.set('error');
              },
          });
    }

    view(e: ControlAuditEventDto): AuditView {
        const meta = e.meta ?? {};
        const badge = this.badge(e.action);

        if (e.action === 'CREATED' && e.entityType === 'CONTROL') {
            const snap = meta.snapshot ?? {};
            const code = snap.code ?? '';
            const title = snap.title ?? 'Control';
            const status = snap.status ? ` (${snap.status})` : '';
            return { badge, title: `Control erstellt: ${code} – ${title}${status}` };
        }

        if (e.action === 'STATUS_CHANGED' && e.entityType === 'CONTROL') {
            const from = meta?.changes?.status?.from ?? null;
            const to = meta?.changes?.status?.to ?? null;
            return { badge, title: from && to ? `Status geändert: ${from} → ${to}` : 'Status geändert' };
        }

        if (e.action === 'EVIDENCE_CREATED' && e.entityType === 'EVIDENCE') {
            const snap = meta.snapshot ?? {};
            if (snap.type === 'NOTE') return { badge, title: 'Evidence hinzugefügt: Notiz', details: snap.note ?? undefined };
            if (snap.type === 'LINK') return { badge, title: 'Evidence hinzugefügt: Link', link: snap.link ?? undefined };
            return { badge, title: 'Evidence hinzugefügt' };
        }

        if (e.action === 'EVIDENCE_DELETED' && e.entityType === 'EVIDENCE') {
            if (meta.bulk) {
                return { badge, title: 'Evidences gelöscht (bulk)', details: `Anzahl: ${meta.deletedCount ?? '?'}` };
            }

            const snap = meta.snapshot ?? {};
            if (snap.type === 'NOTE') return { badge, title: 'Evidence gelöscht: Notiz', details: snap.note ?? undefined };
            if (snap.type === 'LINK') return { badge, title: 'Evidence gelöscht: Link', link: snap.link ?? undefined };
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
