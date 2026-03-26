import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
    selector: 'pb-nis2-info-page',
    imports: [RouterLink, NgOptimizedImage],
    templateUrl: './nis2-info-page.component.html',
    styleUrl: './nis2-info-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Nis2InfoPageComponent {
    protected readonly auth = inject(AuthService);
}

