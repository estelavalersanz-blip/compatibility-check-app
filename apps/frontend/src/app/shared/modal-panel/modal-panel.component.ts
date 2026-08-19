import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Envoltorio visual de "modal sobre la pantalla principal" (feedback explícito de la usuaria:
 * Chats/Configuración deberían sentirse como modales, con su propio cierre, en vez de sentirse como
 * una pantalla más entre las que hay que "volver atrás"). Es SOLO un restyle — `SettingsComponent`,
 * `ChatsComponent` y `ChatConversationComponent` siguen siendo rutas normales de Shell A con sus
 * guards/navegación reales sin cambios (ver `app.routes.ts`); ninguna se abre desde un servicio de
 * diálogo imperativo (`NgbModal` se consideró y se descartó a propósito: aquí no hace falta, y
 * Bootstrap no tiene su JS de modales cargado en este proyecto, ver design.md decisión 3c-bis).
 *
 * El cierre navega a "/" reutilizando `mainRouteGuard` — mismo patrón ya establecido para el logo de
 * la cabecera de `core/shell` (cuestionario o dashboard según el estado del usuario, sin duplicar esa
 * resolución aquí).
 *
 * `title` es opcional: con él, este componente añade su propia franja `card-header` con el título y
 * el cierre. Sin él (`ChatConversationComponent`, que ya tiene su propia cabecera contextual — flecha
 * "volver a /chats" + nombre del participante), el panel no añade nada de chrome propio: el
 * contenido proyectado es responsable de su propia cabecera Y de su propio botón de cerrar, para no
 * duplicar una segunda franja de título encima de la que ya existe.
 *
 * Ocupa todo el ancho de `<main>`, como cualquier otra pantalla de Shell A — sin backdrop oscurecido
 * ni card flotante centrada (decisión revisada tras verlo en producción, ver
 * `modal-panel.component.scss`): la "×" es la única señal visual de que se puede "cerrar" esta
 * pantalla, sin necesitar mostrar nada realmente detrás.
 */
@Component({
  selector: 'app-modal-panel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './modal-panel.component.html',
  styleUrl: './modal-panel.component.scss',
})
export class ModalPanelComponent {
  readonly title = input<string | null>(null);
}
