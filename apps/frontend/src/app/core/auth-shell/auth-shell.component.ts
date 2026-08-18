import { Component, input } from '@angular/core';
import { BrandMarkComponent } from '../../shared/brand-mark/brand-mark.component';

/**
 * Shell B (ui-design-consistency SKILL.md): fondo degradado de marca a pantalla completa, sin card
 * blanca — usado por las 4 pantallas de `features/auth` (login, registro paso 1, forgot/reset
 * password). Compartido para no repetir el `<div class="auth-shell">` + logo + título en cada una.
 *
 * Solo login pasa `wordmark` (título "AfinIA", `h3`) — el resto pasa su propio `title` (`h4`), o
 * ninguno de los dos si la pantalla no lleva encabezado de texto bajo el logo.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [BrandMarkComponent],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.scss',
})
export class AuthShellComponent {
  readonly title = input<string>();
  readonly wordmark = input(false);
}
