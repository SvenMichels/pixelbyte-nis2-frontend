import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type RiskStatus = 'IDENTIFIED' | 'ASSESSED' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED';

export interface RiskDto {
  id: string;
  title: string;
  description?: string | null;
  severity: number; // 1-5
  likelihood: number; // 1-5
  impact: number; // 1-5
  status: RiskStatus;
  ownerId?: string | null;
  owner?: { id: string; email: string; role: string } | null;
  createdAt: string;
  updatedAt: string;
  controls?: RiskControlLinkDto[] | null;
}

export interface ControlSummaryDto {
  id: string;
  code: string;
  title: string;
  status: string;
  category?: string | null;
}

export interface RiskControlLinkDto {
  controlId: string;
  control: ControlSummaryDto;
}

export interface CreateRiskDto {
  title: string;
  description?: string;
  severity?: number;
  likelihood?: number;
  impact?: number;
  ownerId?: string;
}

export interface UpdateRiskDto {
  title?: string;
  description?: string;
  severity?: number;
  likelihood?: number;
  impact?: number;
  ownerId?: string;
}

export interface UpdateRiskStatusDto {
  status: RiskStatus;
}

export type AuditAction = 'CREATED' | 'STATUS_CHANGED' | 'EVIDENCE_CREATED' | 'EVIDENCE_DELETED' | 'UPDATED';
export type AuditEntityType = 'CONTROL' | 'EVIDENCE' | 'RISK';

export interface RiskAuditEventDto {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  meta?: unknown;
  createdAt: string;
  actorId?: string | null;
  actor?: { id: string; email: string; role: string } | null;
}

export interface AuditEventsResponse {
  items: RiskAuditEventDto[];
  nextCursor: string | null;
}

export interface RiskQuery {
  search?: string;
  status?: RiskStatus;
  owner?: string;
  level?: 'low' | 'medium' | 'high' | 'critical';
  minScore?: number;
  maxScore?: number;
  sortKey?: 'score' | 'title' | 'status';
  sortDir?: 'asc' | 'desc';
  take?: number;
  skip?: number;
}

@Injectable({ providedIn: 'root' })
export class RisksApiService {
  private readonly http = inject(HttpClient);

  getAll(query?: RiskQuery): Observable<RiskDto[]> {
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    });
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.status) params.set('status', query.status);
    if (query?.owner) params.set('owner', query.owner);
    if (query?.level) params.set('level', query.level);
    if (query?.minScore !== undefined) params.set('minScore', String(query.minScore));
    if (query?.maxScore !== undefined) params.set('maxScore', String(query.maxScore));
    if (query?.sortKey) params.set('sortKey', query.sortKey);
    if (query?.sortDir) params.set('sortDir', query.sortDir);
    if (query?.take !== undefined) params.set('take', String(query.take));
    if (query?.skip !== undefined) params.set('skip', String(query.skip));

    const url = `/api/risks?${params.toString()}`;
    return this.http.get<RiskDto[]>(url, { headers });
  }

  findOne(id: string): Observable<RiskDto> {
    return this.http.get<RiskDto>(`/api/risks/${id}`);
  }

  create(dto: CreateRiskDto): Observable<RiskDto> {
    return this.http.post<RiskDto>('/api/risks', dto);
  }

  update(id: string, dto: UpdateRiskDto): Observable<RiskDto> {
    return this.http.put<RiskDto>(`/api/risks/${id}`, dto);
  }

  updateStatus(id: string, dto: UpdateRiskStatusDto): Observable<RiskDto> {
    return this.http.patch<RiskDto>(`/api/risks/${id}/status`, dto);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/risks/${id}`);
  }

  getAuditForRisk(riskId: string): Observable<RiskAuditEventDto[]> {
    return this.http.get<RiskAuditEventDto[]>(`/api/risks/${riskId}/audit`);
  }

  linkControl(riskId: string, controlId: string): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>(`/api/risks/${riskId}/controls/${controlId}`, {});
  }

  unlinkControl(riskId: string, controlId: string): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(`/api/risks/${riskId}/controls/${controlId}`);
  }

  getAuditEventsForRisk(riskId: string, take = 25, cursor?: string | null): Observable<AuditEventsResponse> {
    const params = new URLSearchParams();
    params.set('riskId', riskId);
    params.set('take', String(take));
    if (cursor) params.set('cursor', cursor);

    const url = `/api/audit/events?${params.toString()}`;
    return this.http.get<AuditEventsResponse>(url);
  }

  // Helper: Calculate risk score (severity × likelihood)
  calculateRiskScore(risk: RiskDto): number {
    return risk.severity * risk.likelihood;
  }

  // Helper: Get risk level based on score
  getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score <= 6) return 'low';
    if (score <= 12) return 'medium';
    if (score <= 20) return 'high';
    return 'critical';
  }

  // Helper: Get status label in German
  getStatusLabel(status: RiskStatus): string {
    const labels: Record<RiskStatus, string> = {
      IDENTIFIED: 'Identifiziert',
      ASSESSED: 'Bewertet',
      MITIGATED: 'Mitigiert',
      ACCEPTED: 'Akzeptiert',
      CLOSED: 'Geschlossen',
    };
    return labels[status] || status;
  }
}

