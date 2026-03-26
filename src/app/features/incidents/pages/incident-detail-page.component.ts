import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import {
    IncidentDto,
    IncidentStatus,
    IncidentsApiService,
} from '../../../core/api/incidents-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { IncidentAuditTimelineComponent } from '../components/incident-audit-timeline.component';

type UiState = 'loading' | 'ready' | 'error';

const STATUS_OPTIONS: IncidentStatus[] = [
    'DETECTED', 'ANALYSING', 'CONTAINED', 'RESOLVED', 'CLOSED',
    'REPORTED_24H', 'REPORTED_72H', 'REPORT_FINAL',
];

@Component({
    selector: 'pb-incident-detail-page',
    imports: [CommonModule, ReactiveFormsModule, RouterLink, IncidentAuditTimelineComponent],
    templateUrl: './incident-detail-page.component.html',
    styleUrl: './incident-detail-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentDetailPageComponent {
    private readonly api = inject(IncidentsApiService);
    private readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);

    readonly state = signal<UiState>('loading');
    readonly incident = signal<IncidentDto | null>(null);
    readonly errorMessage = signal<string | null>(null);
    readonly statusUpdating = signal(false);

    readonly statusOptions = STATUS_OPTIONS;

    readonly canEdit = computed(() => {
        const role = this.auth.currentUser()?.role;
        return role === 'ADMIN' || role === 'SECURITY';
    });

    readonly linkedControls = computed(() => this.incident()?.controls ?? []);

    private readonly incidentId = toSignal(
        this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
        { initialValue: '' },
    );

    constructor() {
        effect(() => {
            const id = this.incidentId();
            if (!id) {
                this.state.set('error');
                this.errorMessage.set('Incident-ID fehlt.');
                return;
            }
            this.loadIncident(id);
        });
    }

    loadIncident(id: string): void {
        this.state.set('loading');
        this.errorMessage.set(null);

        this.api.findOne(id).subscribe({
            next: (inc) => {
                this.incident.set(inc);
                this.state.set('ready');
            },
            error: () => {
                this.state.set('error');
                this.errorMessage.set('Vorfall konnte nicht geladen werden.');
            },
        });
    }

    changeStatus(newStatus: string): void {
        const inc = this.incident();
        if (!inc || !this.canEdit()) return;

        this.statusUpdating.set(true);
        this.api.updateStatus(inc.id, { status: newStatus as IncidentStatus }).subscribe({
            next: (updated) => {
                this.incident.set(updated);
                this.statusUpdating.set(false);
            },
            error: () => {
                this.statusUpdating.set(false);
            },
        });
    }

    getSeverityLabel(severity: string): string {
        return this.api.getSeverityLabel(severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL');
    }

    getStatusLabel(status: string): string {
        return this.api.getStatusLabel(status as IncidentStatus);
    }

    getSeverityColor(severity: string): string {
        return this.api.getSeverityColor(severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL');
    }

    reload(): void {
        const id = this.incidentId();
        if (id) this.loadIncident(id);
    }
}

