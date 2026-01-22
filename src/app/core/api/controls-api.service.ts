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
}
