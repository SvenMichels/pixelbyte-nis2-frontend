import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type AuditAction = 'CREATED' | 'STATUS_CHANGED' | 'EVIDENCE_CREATED' | 'EVIDENCE_DELETED';
export type AuditEntityType = 'CONTROL' | 'EVIDENCE';

export interface AuditEventDto {
    id: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    controlId?: string | null;
    actorId?: string | null;
    meta?: any;
    createdAt: string;
}

export interface AuditEventsResponseDto {
    items: AuditEventDto[];
    nextCursor: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuditApiService {
    constructor(private readonly http: HttpClient) {
    }

    getEventsForControl(controlId: string, limit = 20, cursor?: string): Observable<AuditEventsResponseDto> {
        let params = new HttpParams()
          .set('controlId', controlId)
          .set('limit', String(limit));

        if (cursor) params = params.set('cursor', cursor);

        return this.http.get<AuditEventsResponseDto>('/api/audit/events', { params });
    }
}
