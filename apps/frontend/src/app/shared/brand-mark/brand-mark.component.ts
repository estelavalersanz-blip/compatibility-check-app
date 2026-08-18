import { Component, input } from '@angular/core';

/**
 * Logo de marca AfinIA — un solo color, 5 `<path>` sin `fill` propio (design-tokens.md, "Logo de
 * marca"). Componente compartido: nunca se redibuja ni se copia el SVG a mano en cada pantalla.
 * `white()` selecciona la variante de Shell B (color fijo blanco sobre el degradado de marca); sin
 * él, hereda `currentColor` del texto del contenedor (uso en Shell A / `core/shell`).
 */
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  templateUrl: './brand-mark.component.html',
  styleUrl: './brand-mark.component.scss',
})
export class BrandMarkComponent {
  readonly white = input(false);
}
