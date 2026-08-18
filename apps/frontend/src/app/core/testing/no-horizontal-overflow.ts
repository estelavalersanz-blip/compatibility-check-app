/** Cede dos vueltas de `requestAnimationFrame` — margen suficiente para que un `ResizeObserver` (el
 *  mecanismo real que usa Chart.js/`ng2-charts` en modo `responsive: true`) reaccione a un cambio de
 *  tamaño del contenedor antes de medir. Sin esto, un `<canvas>` recién movido a un contenedor más
 *  estrecho podría medirse todavía con su tamaño anterior, dando un falso positivo de desbordamiento
 *  que no reproduce lo que vería una persona usuaria real (para cuando la pantalla es visible, el
 *  navegador ya tuvo tiempo de sobra de re-pintar). */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * Ayuda de test para las tareas 21.3/21.5/21.6b (sección 21, diseño responsive): comprueba que
 * `element` no genera scroll horizontal dentro de un contenedor de un ancho dado.
 *
 * A diferencia de lo que depende de una media query real del propio viewport de la ventana de
 * pruebas (p. ej. `navbar-expand-md`, tarea 21.1 — verificado aparte por estructura, no por medida,
 * porque forzar el ancho de un `<div>` no engaña a `@media (min-width: ...)`), si un elemento
 * desborda o no un contenedor de ancho fijo SÍ es una propiedad de caja real (`width`/`flex-wrap`/
 * `overflow-wrap`) que el navegador real de Karma (`karma-chrome-launcher`) calcula igual sin
 * importar el ancho de la ventana del propio Karma — por eso aquí sí tiene sentido medir de verdad
 * en vez de solo comprobar clases.
 *
 * `element` debe venir de `fixture.nativeElement` (ya renderizado por `detectChanges()`). Un
 * `ComponentFixture` de Angular no está adjunto a `document` por defecto — sin insertarlo en algún
 * punto del árbol real, `getBoundingClientRect()`/`scrollWidth` devolverían solo ceros y la
 * comprobación sería un falso positivo. Esta función lo mueve temporalmente a un wrapper de ancho
 * fijo insertado en `document.body`, mide, y lo devuelve exactamente a donde estaba (o lo deja
 * desconectado otra vez, si así empezó) para no dejar el DOM de test contaminado entre `it()`.
 *
 * El wrapper incluye un `.container` de Bootstrap real entre el ancho fijo y `element`: en la app de
 * verdad, toda pantalla autenticada vive dentro de `<main class="container">` de `core/shell`
 * (SKILL.md, "ninguna pantalla debería envolver su contenido en su propio container adicional" — así
 * que un componente como `results-dashboard` que usa `.row`/`.col` da por hecho ese ancestro). Medir
 * el componente sin esa `.container` sería una prueba menos fiel: el `padding` del `.container` es lo
 * que compensa los márgenes negativos del `.row` de Bootstrap; sin él, cualquier `.row`/`.col` "se
 * saldría" unos px por diseño de Bootstrap, aunque en la app real nunca desborde de verdad.
 *
 * Lanza un `Error` normal en vez de usar `expect()` de Jasmine a propósito: este fichero no es un
 * `.spec.ts` (se importa desde varios), así que el build de PRODUCCIÓN también lo compila —
 * `expect` no existe fuera del contexto de test y rompería `ng build` con `TS2304: Cannot find name
 * 'expect'` (confirmado real). Un `Error` lanzado dentro de un `it()` async lo reporta Jasmine igual
 * de bien como fallo; el único coste es un aviso inofensivo de "sin expectations" en el caso de
 * éxito (no falla el test ni el CI), aceptado a cambio de no acoplar este helper a Jasmine.
 */
export async function expectNoHorizontalOverflow(element: HTMLElement, widthPx: number): Promise<void> {
  const originalParent = element.parentElement;
  const originalNextSibling = element.nextSibling;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.top = '0';
  wrapper.style.left = '-9999px'; // fuera de la vista, pero con layout real (nunca display:none)
  wrapper.style.width = `${widthPx}px`;
  document.body.appendChild(wrapper);
  const container = document.createElement('div');
  container.className = 'container';
  wrapper.appendChild(container);
  container.appendChild(element);

  try {
    await nextFrame();

    // 1px de margen: redondeo de subpíxel entre builds de Chrome headless.
    const tolerance = 1;
    const wrapperRight = wrapper.getBoundingClientRect().left + widthPx;
    const overflowing = Array.from(wrapper.querySelectorAll<HTMLElement>('*')).filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.right > wrapperRight + tolerance;
    });
    const actualScrollWidth = wrapper.scrollWidth;

    if (actualScrollWidth > widthPx + tolerance || overflowing.length > 0) {
      const description = overflowing
        .slice(0, 5)
        .map((node) => `<${node.tagName.toLowerCase()} class="${node.getAttribute('class') ?? ''}">`)
        .join(', ');
      throw new Error(
        `Desborda un contenedor de ${widthPx}px (scrollWidth real: ${actualScrollWidth}px).` +
          (description ? ` Elementos que sobresalen: ${description}` : ''),
      );
    }
  } finally {
    if (originalParent) {
      originalParent.insertBefore(element, originalNextSibling);
    } else {
      element.remove();
    }
    wrapper.remove();
  }
}
