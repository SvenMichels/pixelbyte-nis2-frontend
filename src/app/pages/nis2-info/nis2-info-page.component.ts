import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';

@Component({
    selector: 'pb-nis2-info-page',
    imports: [RouterLink, NgOptimizedImage],
    templateUrl: './nis2-info-page.component.html',
    styleUrl: './nis2-info-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Nis2InfoPageComponent {}

