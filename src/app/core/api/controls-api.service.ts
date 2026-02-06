import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type ControlStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'NOT_APPLICABLE';

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
}

export type AuditAction = 'CREATED' | 'STATUS_CHANGED' | 'EVIDENCE_CREATED' | 'EVIDENCE_DELETED';
export type AuditEntityType = 'CONTROL' | 'EVIDENCE';

export interface ControlAuditEventDto {
    id: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    meta?: any;
    createdAt: string;
    actorId?: string | null;
    actor?: { id: string; email: string; role: string } | null;
}

@Injectable({ providedIn: 'root' })
export class ControlsApiService {
    constructor(private readonly http: HttpClient) {
    }

    getAll(): Observable<ControlDto[]> {
        const headers = new HttpHeaders({
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
        });

        const url = `/api/controls?t=${Date.now()}`;
        return this.http.get<ControlDto[]>(url, { headers });
    }

    getAuditForControl(controlId: string): Observable<ControlAuditEventDto[]> {
        return this.http.get<ControlAuditEventDto[]>(`/api/controls/${controlId}/audit`);
    }
}
