import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { FooterComponent } from './core/layout/footer.component';

@Component({
    selector: 'app-root',
    imports: [ RouterOutlet, RouterLink, RouterLinkActive, FooterComponent ],
    templateUrl: './app.html',
    styleUrl: './app.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
    protected readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    protected readonly menuOpen = signal(false);

    toggleMenu(): void {
        this.menuOpen.update((v) => !v);
    }

    closeMenu(): void {
        this.menuOpen.set(false);
    }

    logout(): void {
        this.auth.logout();
        this.menuOpen.set(false);
        this.router.navigateByUrl('/login');
    }
}