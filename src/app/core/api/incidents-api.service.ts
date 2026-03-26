import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'DETECTED' | 'ANALYSING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED' | 'REPORTED_24H' | 'REPORTED_72H' | 'REPORT_FINAL';

export interface IncidentDto {
    id: string;
    title: string;
    description?: string | null;
    severity: IncidentSeverity;
    status: IncidentStatus;
    reportedAt: string;
    resolvedAt?: string | null;
    ownerId?: string | null;
    owner?: { id: string; email: string; role: string } | null;
    createdAt: string;
    updatedAt: string;
    controls?: IncidentControlLinkDto[] | null;
}

export interface IncidentControlLinkDto {
    controlId: string;
    control: {
        id: string;
        code: string;
        title: string;
        status: string;
        category?: string | null;
    };
}

export interface CreateIncidentDto {
    title: string;
    description?: string;
    severity?: IncidentSeverity;
    ownerId?: string;
}

export interface UpdateIncidentDto {
    title?: string;
    description?: string;
    severity?: IncidentSeverity;
    ownerId?: string;
}

export interface UpdateIncidentStatusDto {
    status: IncidentStatus;
}

export interface IncidentAuditEventDto {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    meta?: unknown;
    createdAt: string;
    actorId?: string | null;
    actor?: { id: string; email: string; role: string } | null;
}

export interface IncidentAuditEventsResponse {
    items: IncidentAuditEventDto[];
    nextCursor: string | null;
}

export interface IncidentQuery {
    search?: string;
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    owner?: string;
    sortKey?: 'createdAt' | 'title' | 'status' | 'severity';
    sortDir?: 'asc' | 'desc';
    take?: number;
    skip?: number;
}

@Injectable({ providedIn: 'root' })
export class IncidentsApiService {
    private readonly http = inject(HttpClient);

    getAll(query?: IncidentQuery): Observable<IncidentDto[]> {
        const headers = new HttpHeaders({
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
        });
        const params = new URLSearchParams();
        if (query?.search) params.set('search', query.search);
        if (query?.status) params.set('status', query.status);
        if (query?.severity) params.set('severity', query.severity);
        if (query?.owner) params.set('owner', query.owner);
        if (query?.sortKey) params.set('sortKey', query.sortKey);
        if (query?.sortDir) params.set('sortDir', query.sortDir);
        if (query?.take !== undefined) params.set('take', String(query.take));
        if (query?.skip !== undefined) params.set('skip', String(query.skip));

        const url = `/api/incidents?${params.toString()}`;
        return this.http.get<IncidentDto[]>(url, { headers });
    }

    findOne(id: string): Observable<IncidentDto> {
        return this.http.get<IncidentDto>(`/api/incidents/${id}`);
    }

    create(dto: CreateIncidentDto): Observable<IncidentDto> {
        return this.http.post<IncidentDto>('/api/incidents', dto);
    }

    update(id: string, dto: UpdateIncidentDto): Observable<IncidentDto> {
        return this.http.put<IncidentDto>(`/api/incidents/${id}`, dto);
    }

    updateStatus(id: string, dto: UpdateIncidentStatusDto): Observable<IncidentDto> {
        return this.http.patch<IncidentDto>(`/api/incidents/${id}/status`, dto);
    }

    remove(id: string): Observable<{ ok: boolean; deletedId: string }> {
        return this.http.delete<{ ok: boolean; deletedId: string }>(`/api/incidents/${id}`);
    }

    getAuditEvents(incidentId: string, take = 25, cursor?: string | null): Observable<IncidentAuditEventsResponse> {
        const params = new URLSearchParams();
        params.set('incidentId', incidentId);
        params.set('take', String(take));
        if (cursor) params.set('cursor', cursor);
        return this.http.get<IncidentAuditEventsResponse>(`/api/audit/events?${params.toString()}`);
    }

    linkControl(incidentId: string, controlId: string): Observable<{ ok: boolean }> {
        return this.http.post<{ ok: boolean }>(`/api/incidents/${incidentId}/controls/${controlId}`, {});
    }

    unlinkControl(incidentId: string, controlId: string): Observable<{ ok: boolean }> {
        return this.http.delete<{ ok: boolean }>(`/api/incidents/${incidentId}/controls/${controlId}`);
    }

    getSeverityLabel(severity: IncidentSeverity): string {
        const labels: Record<IncidentSeverity, string> = {
            LOW: 'Niedrig',
            MEDIUM: 'Mittel',
            HIGH: 'Hoch',
            CRITICAL: 'Kritisch',
        };
        return labels[severity] ?? severity;
    }

    getStatusLabel(status: IncidentStatus): string {
        const labels: Record<IncidentStatus, string> = {
            DETECTED: 'Erkannt',
            ANALYSING: 'In Analyse',
            CONTAINED: 'Eingedämmt',
            RESOLVED: 'Behoben',
            CLOSED: 'Geschlossen',
            REPORTED_24H: '24h-Meldung',
            REPORTED_72H: '72h-Meldung',
            REPORT_FINAL: 'Abschlussbericht',
        };
        return labels[status] ?? status;
    }

    getSeverityColor(severity: IncidentSeverity): string {
        const colors: Record<IncidentSeverity, string> = {
            LOW: '#4caf50',
            MEDIUM: '#ff9800',
            HIGH: '#f44336',
            CRITICAL: '#9c27b0',
        };
        return colors[severity] ?? '#757575';
    }
}

