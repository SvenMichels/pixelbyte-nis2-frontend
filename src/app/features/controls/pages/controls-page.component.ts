import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ControlDto, ControlsApiService } from '../../../core/api/controls-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ControlAuditTimelineComponent } from '../components/control-audit-timeline.component';

type UiState = 'loading' | 'ready' | 'error';

@Component({
    selector: 'pb-controls-page',
    standalone: true,
    imports: [
        CommonModule,
        ControlAuditTimelineComponent,
    ],
    templateUrl: './controls-page.component.html',
    styleUrls: [ './controls-page.component.scss' ],
})
export class ControlsPageComponent implements OnInit {
    readonly state = signal<UiState>('loading');
    readonly controls = signal<ControlDto[]>([]);
    readonly openId = signal<string | null>(null);

    constructor(
      private readonly controlsApi: ControlsApiService,
      private readonly auth: AuthService,
      private readonly router: Router,
    ) {
    }

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.state.set('loading');

        this.controlsApi
          .getAll()
          .pipe(finalize(() => {
          }))
          .subscribe({
              next: (res) => {
                  this.controls.set(Array.isArray(res) ? res : []);
                  this.state.set('ready');
              },
              error: (err) => {
                  console.error('[controls] error', err);
                  this.state.set('error');
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

    trackById = (_: number, c: ControlDto) => c.id;
}
