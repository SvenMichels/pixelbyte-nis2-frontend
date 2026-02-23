import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ControlDto, ControlsApiService, ControlStatus } from '../../../core/api/controls-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ControlAuditTimelineComponent } from '../components/control-audit-timeline.component';

type UiState = 'loading' | 'ready' | 'error';

@Component({
    selector: 'pb-controls-page',
    imports: [
        CommonModule,
        RouterLink,
        ControlAuditTimelineComponent,
    ],
    templateUrl: './controls-page.component.html',
    styleUrls: [ './controls-page.component.scss' ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlsPageComponent implements OnInit {
    readonly state = signal<UiState>('loading');
    readonly controls = signal<ControlDto[]>([]);
    readonly openId = signal<string | null>(null);
    readonly loadingMore = signal(false);
    readonly hasMore = signal(true);
    readonly nextCursor = signal<string | null>(null);

    readonly searchQuery = signal('');
    readonly categoryFilter = signal('');
    readonly ownerFilter = signal('');
    readonly sortKey = signal<'code' | 'title' | 'status' | 'category'>('code');
    readonly sortDir = signal<'asc' | 'desc'>('asc');
    readonly selectedStatuses = signal<Set<ControlStatus>>(new Set());

    readonly statusOptions: ControlStatus[] = [
        'NOT_STARTED',
        'IN_PROGRESS',
        'IMPLEMENTED',
        'NOT_APPLICABLE',
    ];

    readonly availableCategories = computed(() => {
        const categories = new Set<string>();
        for (const item of this.controls()) {
            categories.add(item.category ?? 'Uncategorized');
        }
        return Array.from(categories).sort((a, b) => a.localeCompare(b));
    });

    readonly filteredControls = computed(() => {
        const search = this.searchQuery().trim().toLowerCase();
        const category = this.categoryFilter();
        const owner = this.ownerFilter().trim().toLowerCase();
        const selected = this.selectedStatuses();

        const filtered = this.controls().filter((control) => {
            if (selected.size > 0 && !selected.has(control.status)) {
                return false;
            }

            if (category) {
                const value = control.category ?? 'Uncategorized';
                if (value !== category) return false;
            }

            if (owner) {
                const email = control.owner?.email?.toLowerCase() ?? '';
                if (!email.includes(owner)) return false;
            }

            if (search) {
                const hay = `${control.code} ${control.title}`.toLowerCase();
                if (!hay.includes(search)) return false;
            }

            return true;
        });

        return this.sortControls(filtered);
    });

    private readonly pageSize = 50;

    readonly canLoadMore = computed(() => this.hasMore() && !this.loadingMore() && this.state() === 'ready');

    private readonly controlsApi = inject(ControlsApiService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    ngOnInit(): void {
        if (!this.auth.isAuthenticated() || !this.auth.currentUser()) {
            return;
        }

        this.load();
    }

    load(): void {
        this.state.set('loading');
        this.loadingMore.set(false);
        this.hasMore.set(true);
        this.nextCursor.set(null);

        this.controlsApi
          .getAll(this.buildQuery())
          .subscribe({
              next: (res) => {
                  const list = Array.isArray(res.items) ? res.items : [];
                  this.controls.set(list);
                  this.nextCursor.set(res.nextCursor);
                  this.hasMore.set(!!res.nextCursor);
                  this.state.set('ready');
              },
              error: () => {
                  this.state.set('error');
              },
          });
    }

    loadMore(): void {
        if (!this.canLoadMore()) return;

        const cursor = this.nextCursor();
        if (!cursor) return;

        this.loadingMore.set(true);

        this.controlsApi
          .getAll(this.buildQuery(cursor))
          .subscribe({
              next: (res) => {
                  const list = Array.isArray(res.items) ? res.items : [];
                  this.controls.update((curr) => [
                      ...curr,
                      ...list,
                  ]);
                  this.nextCursor.set(res.nextCursor);
                  this.hasMore.set(!!res.nextCursor);
                  this.loadingMore.set(false);
              },
              error: () => {
                  this.loadingMore.set(false);
              },
          });
    }

    logout(): void {
        this.auth.logout();
        this.openId.set(null);
        this.controls.set([]);
        this.state.set('loading');
        this.router.navigateByUrl('/login');
    }

    toggle(id: string): void {
        this.openId.update((curr) => (curr === id ? null : id));
    }

    updateSearch(value: string): void {
        this.searchQuery.set(value);
        this.load();
    }

    updateCategory(value: string): void {
        this.categoryFilter.set(value);
        this.load();
    }

    updateOwner(value: string): void {
        this.ownerFilter.set(value);
        this.load();
    }

    updateSortKey(value: string): void {
        const next = value === 'title' || value === 'status' || value === 'category' ? value : 'code';
        this.sortKey.set(next);
        this.load();
    }

    updateSortDir(value: string): void {
        this.sortDir.set(value === 'desc' ? 'desc' : 'asc');
        this.load();
    }

    toggleStatus(status: ControlStatus, checked: boolean): void {
        const next = new Set(this.selectedStatuses());
        if (checked) {
            next.add(status);
        } else {
            next.delete(status);
        }
        this.selectedStatuses.set(next);
        this.load();
    }

    clearFilters(): void {
        this.searchQuery.set('');
        this.categoryFilter.set('');
        this.ownerFilter.set('');
        this.sortKey.set('code');
        this.sortDir.set('asc');
        this.selectedStatuses.set(new Set());
        this.load();
    }

    isStatusSelected(status: ControlStatus): boolean {
        return this.selectedStatuses().has(status);
    }

    private sortControls(list: ControlDto[]): ControlDto[] {
        const key = this.sortKey();
        const dir = this.sortDir();
        const order = dir === 'desc' ? -1 : 1;
        const statusRank: Record<ControlStatus, number> = {
            NOT_STARTED: 1,
            IN_PROGRESS: 2,
            IMPLEMENTED: 3,
            NOT_APPLICABLE: 4,
        };

        return [ ...list ].sort((a, b) => {
            let cmp = 0;
            if (key === 'status') {
                cmp = statusRank[a.status] - statusRank[b.status];
            } else if (key === 'category') {
                cmp = (a.category ?? 'Uncategorized').localeCompare(b.category ?? 'Uncategorized');
            } else if (key === 'title') {
                cmp = a.title.localeCompare(b.title);
            } else {
                cmp = a.code.localeCompare(b.code);
            }
            return cmp * order;
        });
    }

    private buildQuery(cursor?: string | null) {
        return {
            take: this.pageSize,
            search: this.searchQuery().trim() || undefined,
            category: this.categoryFilter() || undefined,
            owner: this.ownerFilter().trim() || undefined,
            status: Array.from(this.selectedStatuses()),
            sortKey: this.sortKey(),
            sortDir: this.sortDir(),
            cursor: cursor ?? undefined,
        };
    }

    trackById = (_: number, c: ControlDto) => c.id;
}
