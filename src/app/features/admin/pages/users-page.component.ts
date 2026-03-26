import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserDto, UserRole, UsersApiService } from '../../../core/api/users-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CreateUserDialogComponent } from '../components/create-user-dialog.component';
import { EditUserDialogComponent } from '../components/edit-user-dialog.component';

type UiState = 'loading' | 'ready' | 'error';

@Component({
    selector: 'pb-users-page',
    imports: [
        CommonModule,
        FormsModule,
        CreateUserDialogComponent,
        EditUserDialogComponent,
    ],
    templateUrl: './users-page.component.html',
    styleUrl: './users-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPageComponent implements OnInit {
    private readonly api = inject(UsersApiService);
    private readonly auth = inject(AuthService);

    readonly state = signal<UiState>('loading');
    readonly users = signal<UserDto[]>([]);
    readonly showCreateDialog = signal(false);
    readonly editingUser = signal<UserDto | null>(null);
    readonly actionInProgress = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);

    readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? '');

    readonly totalUsers = computed(() => this.users().length);
    readonly adminCount = computed(() => this.users().filter(u => u.role === 'ADMIN').length);
    readonly securityCount = computed(() => this.users().filter(u => u.role === 'SECURITY').length);
    readonly auditorCount = computed(() => this.users().filter(u => u.role === 'AUDITOR').length);
    readonly userCount = computed(() => this.users().filter(u => u.role === 'USER').length);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.state.set('loading');
        this.actionError.set(null);
        this.api.getAll().subscribe({
            next: (data) => {
                this.users.set(data);
                this.state.set('ready');
            },
            error: () => this.state.set('error'),
        });
    }

    getRoleLabel(role: UserRole): string {
        return this.api.getRoleLabel(role);
    }

    formatDate(date: string): string {
        return new Date(date).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }

    openCreateDialog(): void {
        this.showCreateDialog.set(true);
    }

    closeCreateDialog(): void {
        this.showCreateDialog.set(false);
    }

    onUserCreated(): void {
        this.showCreateDialog.set(false);
        this.load();
    }

    openEditDialog(user: UserDto): void {
        if (user.id === this.currentUserId()) return;
        this.editingUser.set(user);
        this.actionError.set(null);
    }

    closeEditDialog(): void {
        this.editingUser.set(null);
    }

    onUserUpdated(): void {
        this.editingUser.set(null);
        this.load();
    }

    confirmDelete(user: UserDto): void {
        if (user.id === this.currentUserId()) return;

        const confirmed = confirm(`Benutzer "${user.email}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`);
        if (!confirmed) return;

        this.actionInProgress.set(user.id);
        this.actionError.set(null);

        this.api.remove(user.id).subscribe({
            next: () => {
                this.actionInProgress.set(null);
                this.load();
            },
            error: (err) => {
                this.actionInProgress.set(null);
                const msg = err?.error?.message;
                this.actionError.set(
                  Array.isArray(msg) ? msg.join(', ') : msg || 'Fehler beim Löschen des Benutzers.',
                );
            },
        });
    }

    isBusy(userId: string): boolean {
        return this.actionInProgress() === userId;
    }

    trackById = (_: number, user: UserDto) => user.id;
}

