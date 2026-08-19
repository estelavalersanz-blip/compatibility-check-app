import { Component, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ModalPanelComponent } from './modal-panel.component';

@Component({ standalone: true, template: 'pantalla principal (destino del cierre)' })
class BlankMainComponent {}

@Component({
  standalone: true,
  imports: [ModalPanelComponent],
  template: `
    <app-modal-panel title="Configuración">
      <p class="test-content">Contenido proyectado</p>
    </app-modal-panel>
  `,
})
class HostWithTitleComponent {}

@Component({
  standalone: true,
  imports: [ModalPanelComponent],
  template: `
    <app-modal-panel>
      <div class="card-header d-flex align-items-center justify-content-between">
        <span>Cabecera propia del contenido</span>
      </div>
      <p class="test-content">Contenido proyectado sin título</p>
    </app-modal-panel>
  `,
})
class HostWithoutTitleComponent {}

/**
 * Mismo patrón que `core/shell/shell.component.spec.ts` (`provideRouter` + `RouterTestingHarness`,
 * en vez de montar el componente a pelo con `TestBed.createComponent`): el cierre del panel navega
 * de verdad a "/" (reutiliza `mainRouteGuard`, ver decisión ya documentada para el logo de la
 * cabecera), así que hace falta un `Router` real para poder comprobar el destino de esa navegación.
 */
async function mount(hostComponent: Type<unknown>) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'host', component: hostComponent },
        { path: '', pathMatch: 'full', component: BlankMainComponent },
      ]),
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/host');
  harness.detectChanges();
  return harness;
}

type Harness = Awaited<ReturnType<typeof mount>>;

function rootElement(harness: Harness): HTMLElement {
  return harness.fixture.nativeElement as HTMLElement;
}

/**
 * `shared/modal-panel` (feedback explícito de la usuaria: Chats/Configuración deberían sentirse como
 * modales sobre la pantalla principal, con su propio cierre) — envoltorio visual puro: backdrop +
 * card centrada + cierre. Las rutas/guards reales de `SettingsComponent`/`ChatsComponent`/
 * `ChatConversationComponent` no cambian (siguen siendo rutas normales de Shell A, ver
 * `app.routes.ts`); esto solo restyla lo que ya se monta ahí. `title` es opcional a propósito:
 * `ChatConversationComponent` ya tiene su propia cabecera contextual (flecha "volver a /chats" +
 * nombre del participante) y este componente no debe duplicarla con una segunda franja de título.
 */
describe('ModalPanelComponent', () => {
  it('con title, muestra una cabecera propia con el título y proyecta el contenido', async () => {
    const harness = await mount(HostWithTitleComponent);
    const root = rootElement(harness);

    const header = root.querySelector('.card-header');
    expect(header?.textContent).toContain('Configuración');
    expect(root.querySelector('.test-content')?.textContent).toContain('Contenido proyectado');
  });

  it('sin title, no añade una cabecera propia (evita duplicar la cabecera del contenido proyectado)', async () => {
    const harness = await mount(HostWithoutTitleComponent);
    const root = rootElement(harness);

    // Solo debe existir la ÚNICA `card-header` que trae el propio contenido proyectado (host de
    // prueba), nunca una segunda añadida por el panel.
    const headers = root.querySelectorAll('.card-header');
    expect(headers.length).toBe(1);
    expect(headers[0].textContent).toContain('Cabecera propia del contenido');
  });

  it('el botón de cerrar (con title) tiene aria-label "Cerrar" y navega a la pantalla principal ("/")', async () => {
    const harness = await mount(HostWithTitleComponent);
    const closeButton = rootElement(harness).querySelector<HTMLButtonElement>(
      'button[aria-label="Cerrar"]',
    );
    if (!closeButton) {
      throw new Error('No se encontró el botón de cerrar');
    }

    closeButton.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('sin title, no muestra ningún botón de cerrar propio (el contenido proyectado gestiona el suyo)', async () => {
    const harness = await mount(HostWithoutTitleComponent);
    const closeButton = rootElement(harness).querySelector('button[aria-label="Cerrar"]');
    expect(closeButton).toBeNull();
  });

  /**
   * Decisión revisada (feedback explícito de la usuaria tras verlo en producción): una primera
   * versión envolvía la card en un backdrop oscurecido a pantalla completa, centrada y con ancho
   * máximo — sin la pantalla anterior realmente visible detrás (Option 1 nunca la mantiene montada),
   * el hueco se veía como un gris plano sin sentido, y además se escondía parcialmente detrás de la
   * cabecera (bug real de posicionamiento). Ahora el panel ocupa todo el ancho de `<main>`, como
   * cualquier otra pantalla — sin backdrop ni centrado propio.
   */
  it('ocupa todo el ancho disponible, sin backdrop ni card centrada/flotante', async () => {
    const harness = await mount(HostWithTitleComponent);
    const root = rootElement(harness);

    expect(root.querySelector('.modal-panel-backdrop')).toBeNull();
    expect(root.querySelector('.modal-panel-card')).toBeNull();
    const card = root.querySelector('.card');
    expect(card).not.toBeNull();
    expect(getComputedStyle(card as Element).maxWidth).toBe('none');
  });
});
