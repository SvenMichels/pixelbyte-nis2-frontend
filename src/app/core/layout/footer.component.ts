import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
		<footer class="app-footer" role="contentinfo">
			<div class="app-footer__inner">
				<div class="app-footer__brand">
					<span class="app-footer__logo">Pixelbyte</span>
					<span class="app-footer__copy">&copy; {{ year }} Pixelbyte. Alle Rechte vorbehalten.</span>
				</div>

				<nav class="app-footer__links" aria-label="Footer-Navigation">
					<a href="https://pixelbyte.dev/impressum" target="_blank" rel="noopener noreferrer">Impressum</a>
					<a href="https://pixelbyte.dev/datenschutz" target="_blank" rel="noopener noreferrer">Datenschutz</a>
					<a href="https://pixelbyte.dev/contact" target="_blank" rel="noopener noreferrer">Kontakt</a>
				</nav>

				<div class="app-footer__meta">
					<span>NIS2 Compliance Tool v0.2.0</span>
				</div>
			</div>
		</footer>
  `,
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}

