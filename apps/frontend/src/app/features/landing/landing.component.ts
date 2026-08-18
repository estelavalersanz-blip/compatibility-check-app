import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Landing pública (`/`, sin sesión activa — design.md decisión 3g, sección 11d). El caso "ya hay
 * sesión → no mostrar la landing" NO se comprueba aquí: lo decide `mainRouteGuard` (sección 11) antes
 * de activar esta ruta, así que si este componente llega a montarse es porque ya se sabe que no hay
 * sesión — no hace falta repetir la comprobación ni redirigir desde el propio componente.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  /**
   * Además de la `@media (prefers-reduced-motion: reduce)` real (SCSS, para producción), se computa
   * aquí para poder simularlo en tests de componente (tarea 11d.2) sin depender de que el entorno de
   * test soporte forzar esa media query en el navegador.
   */
  readonly reducedMotion = signal(
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
}
