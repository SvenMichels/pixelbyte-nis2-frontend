import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AuditApiService, AuditEventDto } from '../../../core/api/audit-api.service';

type UiState = 'idle' | 'loading' | 'error';

@Component({
    selector: 'pb-control-audit-timeline',
    standalone: true,
    imports: [
        CommonModule,
        DatePipe,
    ],
    templateUrl: './control-audit-timeline.component.html',
    styleUrls: [ './control-audit-timeline.component.scss' ],
})
export class ControlAuditTimelineComponent implements OnChanges {
    @Input({ required: true }) controlId!: string;

    state: UiState = 'idle';
    events: AuditEventDto[] = [];
    nextCursor: string | null = null;

    constructor(private readonly auditApi: AuditApiService) {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['controlId']?.currentValue) this.reload();
    }

    reload(): void {
        this.events = [];
        this.nextCursor = null;
        this.loadMore(true);
    }

    loadMore(reset = false): void {
        if (!this.controlId) return;
        if (this.state === 'loading') return;

        this.state = 'loading';
        const cursor = reset ? undefined : this.nextCursor ?? undefined;

        this.auditApi.getEventsForControl(this.controlId, 10, cursor).subscribe({
            next: (res) => {
                this.events = reset ? res.items : [
                    ...this.events,
                    ...res.items,
                ];
                this.nextCursor = res.nextCursor;
                this.state = 'idle';
            },
            error: () => (this.state = 'error'),
        });
    }

    prettyTitle(ev: AuditEventDto): string {
        switch (ev.action) {
            case 'STATUS_CHANGED': {
                const from = ev.meta?.changes?.status?.from;
                const to = ev.meta?.changes?.status?.to;
                return from && to ? `Status geändert: ${from} → ${to}` : 'Status geändert';
            }
            case 'EVIDENCE_CREATED': {
                const type = ev.meta?.snapshot?.type;
                return type ? `Evidence hinzugefügt (${type})` : 'Evidence hinzugefügt';
            }
            case 'EVIDENCE_DELETED': {
                const type = ev.meta?.snapshot?.type;
                return type ? `Evidence gelöscht (${type})` : 'Evidence gelöscht';
            }
            case 'CREATED':
                return 'Erstellt';
            default:
                return ev.action;
        }
    }

    detailLine(ev: AuditEventDto): string | null {
        const snap = ev.meta?.snapshot;
        if (!snap) return null;

        if (snap.type === 'LINK' && snap.link) return snap.link;
        if (snap.type === 'NOTE' && snap.note) return snap.note;
        return null;
    }

    detailsFor(ev: AuditEventDto): string | null {
        return this.detailLine(ev);
    }

    trackById = (_: number, ev: AuditEventDto) => ev.id;
}
