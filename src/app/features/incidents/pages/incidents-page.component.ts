import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
    IncidentDto,
    IncidentSeverity,
    IncidentStatus,
    IncidentsApiService,
} from '../../../core/api/incidents-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CreateIncidentDialogComponent } from '../components/create-incident-dialog.component';
import { IncidentAuditTimelineComponent } from '../components/incident-audit-timeline.component';

type UiState = 'loading' | 'ready' | 'error';

@Component({
    selector: 'pb-incidents-page',
    imports: [CommonModule, RouterLink, IncidentAuditTimelineComponent, CreateIncidentDialogComponent],
    templateUrl: './incidents-page.component.html',
    styleUrl: './incidents-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentsPageComponent implements OnInit {
    private readonly api = inject(IncidentsApiService);
    private readonly auth = inject(AuthService);

    readonly state = signal<UiState>('loading');
    readonly incidents = signal<IncidentDto[]>([]);
    readonly auditOpen = signal<Record<string, boolean>>({});
    readonly showCreateDialog = signal(false);

    readonly canCreate = computed(() => {
        const role = this.auth.currentUser()?.role;
        return role === 'ADMIN' || role === 'SECURITY';
    });

    readonly searchQuery = signal('');
    readonly statusFilter = signal<IncidentStatus | ''>('');
    readonly severityFilter = signal<IncidentSeverity | ''>('');
    readonly sortKey = signal<'createdAt' | 'title' | 'status' | 'severity'>('createdAt');
    readonly sortDir = signal<'desc' | 'asc'>('desc');

    readonly statusOptions: IncidentStatus[] = [
        'DETECTED', 'ANALYSING', 'CONTAINED', 'RESOLVED', 'CLOSED',
        'REPORTED_24H', 'REPORTED_72H', 'REPORT_FINAL',
    ];

    readonly severityOptions: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    readonly filteredIncidents = computed(() => {
        const search = this.searchQuery().trim().toLowerCase();
        const status = this.statusFilter();
        const severity = this.severityFilter();

        return this.incidents().filter((inc) => {
            if (status && inc.status !== status) return false;
            if (severity && inc.severity !== severity) return false;
            if (search) {
                const hay = `${inc.title} ${inc.description ?? ''}`.toLowerCase();
                if (!hay.includes(search)) return false;
            }
            return true;
        });
    });

    readonly totalIncidents = computed(() => this.filteredIncidents().length);
    readonly openIncidents = computed(() =>
        this.filteredIncidents().filter(i =>
            i.status === 'DETECTED' || i.status === 'ANALYSING' || i.status === 'CONTAINED',
        ).length,
    );
    readonly criticalIncidents = computed(() =>
        this.filteredIncidents().filter(i => i.severity === 'CRITICAL').length,
    );
    readonly resolvedIncidents = computed(() =>
        this.filteredIncidents().filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
    );

    ngOnInit(): void {
        if (!this.auth.isAuthenticated() || !this.auth.currentUser()) return;
        this.load();
    }

    load(): void {
        this.state.set('loading');
        this.api.getAll(this.buildQuery()).subscribe({
            next: (data) => {
                this.incidents.set(data);
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

    getSeverityLabel(severity: IncidentSeverity): string {
        return this.api.getSeverityLabel(severity);
    }

    getStatusLabel(status: IncidentStatus | string): string {
        return this.api.getStatusLabel(status as IncidentStatus);
    }

    getSeverityColor(severity: IncidentSeverity): string {
        return this.api.getSeverityColor(severity);
    }

    updateSearch(value: string): void {
        this.searchQuery.set(value);
    }

    updateStatusFilter(value: string): void {
        this.statusFilter.set(this.statusOptions.includes(value as IncidentStatus) ? (value as IncidentStatus) : '');
        this.load();
    }

    updateSeverityFilter(value: string): void {
        this.severityFilter.set(this.severityOptions.includes(value as IncidentSeverity) ? (value as IncidentSeverity) : '');
        this.load();
    }

    updateSortKey(value: string): void {
        const valid: Array<typeof this.sortKey extends { (): infer T } ? T : never> = ['createdAt', 'title', 'status', 'severity'];
        this.sortKey.set(valid.includes(value as 'createdAt') ? value as 'createdAt' : 'createdAt');
        this.load();
    }

    updateSortDir(value: string): void {
        this.sortDir.set(value === 'asc' ? 'asc' : 'desc');
        this.load();
    }

    clearFilters(): void {
        this.searchQuery.set('');
        this.statusFilter.set('');
        this.severityFilter.set('');
        this.sortKey.set('createdAt');
        this.sortDir.set('desc');
        this.load();
    }

    openCreateDialog(): void {
        if (!this.canCreate()) return;
        this.showCreateDialog.set(true);
    }

    closeCreateDialog(): void {
        this.showCreateDialog.set(false);
    }

    onIncidentCreated(): void {
        this.showCreateDialog.set(false);
        this.load();
    }

    private buildQuery() {
        return {
            search: this.searchQuery().trim() || undefined,
            status: this.statusFilter() || undefined,
            severity: this.severityFilter() || undefined,
            sortKey: this.sortKey(),
            sortDir: this.sortDir(),
        };
    }

    trackById = (_: number, incident: IncidentDto) => incident.id;
}

