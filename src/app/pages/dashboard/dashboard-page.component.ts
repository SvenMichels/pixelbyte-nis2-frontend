import { CommonModule, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DashboardApiService, DashboardStats, RecentAuditEvent } from '../../core/api/dashboard-api.service';
import { AuthService } from '../../core/auth/auth.service';

type UiState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'pb-dashboard-page',
  imports: [CommonModule, RouterLink, UpperCasePipe],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  private readonly api = inject(DashboardApiService);
  private readonly auth = inject(AuthService);

  readonly state = signal<UiState>('loading');
  readonly stats = signal<DashboardStats | null>(null);
  readonly recentEvents = signal<RecentAuditEvent[]>([]);

  readonly evidenceCoverageColor = computed(() => {
    const percent = this.stats()?.controls.evidenceCoveragePercent ?? 0;
    if (percent >= 80) return 'green';
    if (percent >= 50) return 'yellow';
    return 'red';
  });

  readonly hasTopRisks = computed(() => {
    const topRisks = this.stats()?.risks?.topRisks;
    return Array.isArray(topRisks) && topRisks.length > 0;
  });

  readonly hasIncidents = computed(() => (this.stats()?.incidents?.total ?? 0) > 0);

  readonly incidentOpenColor = computed(() => {
    const open = this.stats()?.incidents?.open ?? 0;
    if (open === 0) return 'green';
    if (open <= 3) return 'yellow';
    return 'red';
  });

  ngOnInit(): void {
    if (!this.auth.isAuthenticated() || !this.auth.currentUser()) {
      return;
    }
    this.load();
  }

  load(): void {
    this.state.set('loading');

    Promise.all([
      firstValueFrom(this.api.getStats()),
      firstValueFrom(this.api.getRecentEvents(25)),
    ])
      .then(([stats, events]) => {
        this.stats.set(stats ?? null);
        this.recentEvents.set(Array.isArray(events) ? events : []);
        this.state.set('ready');
      })
      .catch(() => {
        this.stats.set(null);
        this.recentEvents.set([]);
        this.state.set('error');
      });
  }

  formatEventTitle(event: RecentAuditEvent): string {
    const type = event.entityType;
    const action = event.action;

    if (action === 'CREATED') return `${type} erstellt`;
    if (action === 'STATUS_CHANGED') return `${type} Status geändert`;
    if (action === 'UPDATED') return `${type} aktualisiert`;
    if (action === 'EVIDENCE_CREATED') return 'Evidence hochgeladen';
    if (action === 'EVIDENCE_DELETED') return 'Evidence gelöscht';
    if (action === 'INCIDENT_REPORTED') return 'Vorfall gemeldet';
    if (action === 'INCIDENT_RESOLVED') return 'Vorfall behoben';
    if (action === 'RISK_CONTROL_LINKED') return `${type} mit Control verknüpft`;
    if (action === 'RISK_CONTROL_UNLINKED') return `${type}-Control Verknüpfung gelöst`;
    return `${type} ${action}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  trackById = (_: number, event: RecentAuditEvent) => event.id;
}

