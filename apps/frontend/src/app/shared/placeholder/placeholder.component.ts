import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Contenido provisional para rutas cuya feature real todavía no se ha implementado (secciones 12 en
 * adelante) — existe solo para que el router de la sección 11 tenga un componente real al que
 * navegar (los guards/tests de esta sección comprueban navegación de verdad, no solo la llamada al
 * guard en aislado) y para que `ng build`/`ng serve` sigan funcionando de extremo a extremo mientras
 * el frontend se construye sección a sección. Cada sección futura sustituye, en `app.routes.ts`, el
 * `component: PlaceholderComponent` de su propia ruta por su feature real — no hay que borrar nada
 * aquí para que eso ocurra.
 */
@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <h1 class="h4">{{ title }}</h1>
    <p class="text-body-secondary">Pantalla en construcción — llegará en una sección posterior.</p>
  `,
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title: string = (this.route.snapshot.data['title'] as string | undefined) ?? 'En construcción';
}
