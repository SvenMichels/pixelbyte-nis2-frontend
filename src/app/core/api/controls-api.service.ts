import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ControlStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'NOT_APPLICABLE';
export type EvidenceType = 'NOTE' | 'LINK';

export interface ControlDto {
    id: string;
    code: string;
    title: string;
    description?: string | null;
    category?: string | null;
    status: ControlStatus;
    createdAt?: string;
    updatedAt?: string;
    owner?: { id: string; email: string; role: string } | null;
    risks?: ControlRiskLinkDto[] | null;
}

export interface RiskDto {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    severity: number;
    likelihood: number;
    impact: number;
    owner?: { id: string; email: string; role: string } | null;
}

export interface ControlRiskLinkDto {
    riskId: string;
    controlId: string;
    createdAt?: string;
    risk: RiskDto;
}

export interface ControlEvidenceDto {
    id: string;
    controlId: string;
    type: EvidenceType;
    note?: string | null;
    link?: string | null;
    createdAt: string;
}

export interface CreateEvidenceDto {
    type: EvidenceType;
    note?: string;
    link?: string;
}

export interface UpdateControlStatusDto {
    status: ControlStatus;
}

export type AuditAction = 'CREATED' | 'STATUS_CHANGED' | 'EVIDENCE_CREATED' | 'EVIDENCE_DELETED' | 'UPDATED' | 'RISK_CONTROL_LINKED';
export type AuditEntityType = 'CONTROL' | 'EVIDENCE' | 'RISK';

export type ControlsQuery = {
    take?: number;
    skip?: number;
    search?: string;
    category?: string;
    owner?: string;
    status?: ControlStatus[];
    sortKey?: 'code' | 'title' | 'status' | 'category';
    sortDir?: 'asc' | 'desc';
    cursor?: string | null;
};

export type ControlsResponse = {
    items: ControlDto[];
    nextCursor: string | null;
};

export interface ControlAuditEventDto {
    id: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    meta?: unknown;
    createdAt: string;
    actorId?: string | null;
    actor?: { id: string; email: string; role: string } | null;
}

export type AuditEventsResponse = {
    items: ControlAuditEventDto[];
    nextCursor: string | null;
};

@Injectable({ providedIn: 'root' })
export class ControlsApiService {
    private readonly http = inject(HttpClient);

    getAll(query?: ControlsQuery): Observable<ControlsResponse> {
        const headers = new HttpHeaders({
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
        });

        const params = new URLSearchParams();
        if (query?.take !== undefined) params.set('take', String(query.take));
        if (query?.skip !== undefined) params.set('skip', String(query.skip));
        if (query?.search) params.set('search', query.search);
        if (query?.category) params.set('category', query.category);
        if (query?.owner) params.set('owner', query.owner);
        if (query?.status && query.status.length > 0) params.set('status', query.status.join(','));
        if (query?.sortKey) params.set('sortKey', query.sortKey);
        if (query?.sortDir) params.set('sortDir', query.sortDir);
        if (query?.cursor) params.set('cursor', query.cursor);

        const url = `/api/controls?${params.toString()}`;
        return this.http.get<ControlsResponse>(url, { headers });
    }

    getById(controlId: string): Observable<ControlDto> {
        return this.http.get<ControlDto>(`/api/controls/${controlId}`);
    }

    updateStatus(controlId: string, status: ControlStatus): Observable<ControlDto> {
        const payload: UpdateControlStatusDto = { status };
        return this.http.patch<ControlDto>(`/api/controls/${controlId}/status`, payload);
    }

    getEvidence(controlId: string): Observable<ControlEvidenceDto[]> {
        return this.http.get<ControlEvidenceDto[]>(`/api/controls/${controlId}/evidence`);
    }

    addEvidence(controlId: string, payload: CreateEvidenceDto): Observable<ControlEvidenceDto> {
        return this.http.post<ControlEvidenceDto>(`/api/controls/${controlId}/evidence`, payload);
    }

    deleteEvidence(controlId: string, evidenceId: string): Observable<{ ok: boolean; deletedId: string }> {
        return this.http.delete<{ ok: boolean; deletedId: string }>(
          `/api/controls/${controlId}/evidence/${evidenceId}`,
        );
    }

    deleteEvidenceBulk(controlId: string): Observable<{ ok: boolean; deletedCount: number }> {
        return this.http.delete<{ ok: boolean; deletedCount: number }>(`/api/controls/${controlId}/evidence`);
    }

    getAuditForControl(controlId: string): Observable<ControlAuditEventDto[]> {
        return this.http.get<ControlAuditEventDto[]>(`/api/controls/${controlId}/audit`);
    }

    getAuditEventsForControl(controlId: string, take = 25, cursor?: string | null): Observable<AuditEventsResponse> {
        const params = new URLSearchParams();
        params.set('controlId', controlId);
        params.set('take', String(take));
        if (cursor) params.set('cursor', cursor);

        const url = `/api/audit/events?${params.toString()}`;
        return this.http.get<AuditEventsResponse>(url);
    }
}
