import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type UserRole = 'ADMIN' | 'SECURITY' | 'AUDITOR' | 'USER';

export interface UserDto {
    id: string;
    email: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
}

export interface CreateUserDto {
    email: string;
    password: string;
    role?: UserRole;
}

export interface UpdateUserDto {
    email?: string;
    password?: string;
    role?: UserRole;
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
    private readonly http = inject(HttpClient);

    getAll(): Observable<UserDto[]> {
        return this.http.get<UserDto[]>('/api/users');
    }

    getOne(id: string): Observable<UserDto> {
        return this.http.get<UserDto>(`/api/users/${id}`);
    }

    create(dto: CreateUserDto): Observable<UserDto> {
        return this.http.post<UserDto>('/api/users', dto);
    }

    update(id: string, dto: UpdateUserDto): Observable<UserDto> {
        return this.http.patch<UserDto>(`/api/users/${id}`, dto);
    }

    remove(id: string): Observable<{ ok: boolean; deletedId: string }> {
        return this.http.delete<{ ok: boolean; deletedId: string }>(`/api/users/${id}`);
    }

    getRoleLabel(role: UserRole): string {
        const labels: Record<UserRole, string> = {
            ADMIN: 'Administrator',
            SECURITY: 'Security Officer',
            AUDITOR: 'Auditor',
            USER: 'Benutzer',
        };
        return labels[role] ?? role;
    }
}

