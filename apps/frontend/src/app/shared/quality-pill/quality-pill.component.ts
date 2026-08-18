import { Component, input, output } from '@angular/core';

/**
 * Píldora seleccionable de una cualidad personal (design.md decisión 3d/3d-bis; ui-design-consistency
 * SKILL.md, "Sistema de botones..."). Componente compartido entre `features/registration` (sección
 * 13) y `features/settings` (sección 17) — no duplicar el marcado en los dos sitios.
 *
 * El tope de 5 se hace cumplir aquí (deshabilitar si no está seleccionada y ya hay 5 marcadas en el
 * grupo), no en el contenedor: `selectedCount` lo pasa el padre (recuento del grupo completo), esta
 * píldora no conoce ni gestiona su propio estado de selección, solo lo refleja.
 */
@Component({
  selector: 'app-quality-pill',
  standalone: true,
  templateUrl: './quality-pill.component.html',
  styleUrl: './quality-pill.component.scss',
})
export class QualityPillComponent {
  readonly label = input.required<string>();
  readonly selected = input(false);
  readonly selectedCount = input(0);
  // `toggled`, no `toggle`: `@angular-eslint/no-output-native` rechaza nombres de output que
  // coincidan con un evento nativo del DOM (`toggle`, el de <details>) — design-tokens.md usa
  // `(toggle)` como nombre ilustrativo, pero linta en rojo tal cual en este proyecto.
  readonly toggled = output<void>();
}
