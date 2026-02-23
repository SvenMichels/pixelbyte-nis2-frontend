import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface DashboardStats {
    controls: {
        total: number;
        byStatus: Record<string, number>;
        withEvidence: number;
        evidenceCoveragePercent: number;
    };
    risks: {
        total: number;
        byStatus: Record<string, number>;
        byLevel: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        topRisks: Array<{
            id: string;
            title: string;
            score: number;
            level: string;
        }>;
    };
    audit: {
        totalEvents: number;
        last24h: number;
    };
}

export interface RecentAuditEvent {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    meta?: unknown;
    createdAt: string;
    actorId?: string | null;
    actor?: { id: string; email: string; role: string } | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
    private readonly http = inject(HttpClient);

    getStats(): Observable<DashboardStats> {
        return this.http.get<DashboardStats>('/api/dashboard/stats');
    }

    getRecentEvents(take: number = 25): Observable<RecentAuditEvent[]> {
        return this.http.get<RecentAuditEvent[]>(`/api/audit/recent?take=${take}`);
    }
}

