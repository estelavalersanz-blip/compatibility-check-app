import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  AggregatedResult,
  ComparisonQuestionDetail,
  ComparisonSummary,
  UserProfile,
} from '@compatibility-check-app/shared-types';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { of } from 'rxjs';
import { ChatService } from '../../core/chat.service';
import { ComparisonsService } from '../../core/comparisons.service';
import { expectNoHorizontalOverflow } from '../../core/testing/no-horizontal-overflow';
import { DASHBOARD_POLL_INTERVAL_MS, ResultsDashboardComponent } from './results-dashboard.component';

/** Espera real (no `fakeAsync`/`tick` — este proyecto no carga `zone.js/testing`, ver el comentario
 *  de cabecera de `DASHBOARD_POLL_INTERVAL_MS`): combinado con un `pollIntervalMs` de test de pocos
 *  milisegundos (ver `setup()`), esperar un puñado de milisegundos reales es rápido y no-flaky, mismo
 *  criterio que `TEST_DEFAULT_BACKOFF_MS` en el backend (`ai-orchestrator.service.ts`). */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fakeCandidate(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-2',
    name: 'Nombre completo distinto del alias',
    alias: 'bea',
    photoUrl: 'https://example.com/bea.jpg',
    questionnaireCompletedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function fakeResult(compatibilidadFinal: number): AggregatedResult {
  return {
    emocional: 8,
    valores: 7,
    estilo: 6,
    intereses: 9,
    madurez: 7,
    apertura: 8,
    compatibilidad_final: compatibilidadFinal,
    weights: {
      dimension: { emocional: 0.2, valores: 0.25, estilo: 0.1, intereses: 0.25, madurez: 0.1, apertura: 0.1 },
      block: [0.05, 0.05, 0.15, 0.2, 0.25, 0.3],
    },
  };
}

function fakeComparison(overrides: Partial<ComparisonSummary> = {}): ComparisonSummary {
  return {
    id: 'cmp-1',
    status: 'completed',
    candidate: fakeCandidate(),
    sharedQualitiesCount: 3,
    result: fakeResult(7.5),
    ...overrides,
  };
}

function fakeDetail(overrides: Partial<ComparisonQuestionDetail> = {}): ComparisonQuestionDetail {
  return {
    questionId: 1,
    pregunta: '¿Pregunta de prueba?',
    compatibilidad: 8,
    emocional: 8,
    valores: 8,
    estilo: 8,
    intereses: 8,
    madurez: 8,
    apertura: 8,
    explicación: 'Explicación de la IA',
    ...overrides,
  };
}

function setup(
  options: {
    findMineSpy?: jasmine.Spy;
    comparisons?: ComparisonSummary[];
    findDetailSpy?: jasmine.Spy;
    startConversationSpy?: jasmine.Spy;
    /** Solo lo pasan los tests de sondeo — el resto no necesita esperar nada, así que se quedan con
     *  el valor de producción (3000ms) de la propia `factory` del token, sin efecto real en un test
     *  síncrono. */
    pollIntervalMs?: number;
  } = {},
) {
  const findMineSpy =
    options.findMineSpy ?? jasmine.createSpy('findMine').and.returnValue(of(options.comparisons ?? [fakeComparison()]));
  const findDetailSpy = options.findDetailSpy ?? jasmine.createSpy('findDetail').and.returnValue(of([]));
  const startConversationSpy =
    options.startConversationSpy ?? jasmine.createSpy('startConversation').and.returnValue(of({ id: 'conv-1' }));

  TestBed.configureTestingModule({
    imports: [ResultsDashboardComponent],
    providers: [
      provideRouter([{ path: 'chats/:id', component: ResultsDashboardComponent }]),
      // Solo app.config.ts (nunca cargado por TestBed) registra los controladores de Chart.js en
      // la app real — sin esto, renderizar cualquier tarjeta 'completed' lanza "radialLinear is not
      // a registered scale" al crear el <canvas baseChart>.
      provideCharts(withDefaultRegisterables()),
      { provide: ComparisonsService, useValue: { findMine: findMineSpy, findDetail: findDetailSpy } },
      { provide: ChatService, useValue: { startConversation: startConversationSpy } },
      ...(options.pollIntervalMs !== undefined
        ? [{ provide: DASHBOARD_POLL_INTERVAL_MS, useValue: options.pollIntervalMs }]
        : []),
    ],
  });

  const fixture = TestBed.createComponent(ResultsDashboardComponent);
  fixture.detectChanges();
  return { fixture, findMineSpy, findDetailSpy, startConversationSpy };
}

function root(fixture: ComponentFixture<ResultsDashboardComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function findButton(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((candidate) =>
    candidate.textContent?.trim().includes(text),
  );
  if (!button) {
    throw new Error(`No se encontró el botón "${text}"`);
  }
  return button;
}

function cards(fixture: ComponentFixture<ResultsDashboardComponent>): HTMLElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('.row > .col > .card'));
}

describe('ResultsDashboardComponent — tarjetas (tarea 16.1)', () => {
  it('ordena de mayor a menor compatibilidad_final y muestra el alias, nunca el nombre', () => {
    const { fixture } = setup({
      comparisons: [
        fakeComparison({
          id: 'cmp-low',
          result: fakeResult(5),
          candidate: fakeCandidate({ alias: 'baja-compat', name: 'Nombre Propio De Baja' }),
        }),
        fakeComparison({
          id: 'cmp-high',
          result: fakeResult(9.2),
          candidate: fakeCandidate({ alias: 'alta-compat', name: 'Nombre Propio De Alta' }),
        }),
      ],
    });

    const cardList = cards(fixture);
    expect(cardList.length).toBe(2);
    expect(cardList[0].textContent).toContain('alta-compat');
    expect(cardList[1].textContent).toContain('baja-compat');

    const fullText = root(fixture).textContent ?? '';
    expect(fullText).not.toContain('Nombre Propio De Alta');
    expect(fullText).not.toContain('Nombre Propio De Baja');
  });

  // Antes "el detalle de las 36 preguntas..." — desde que el backend solo analiza 6 preguntas
  // muestreadas (1 por bloque, ver ai-orchestrator.service.ts), el detalle ya no son 36 filas; este
  // test en sí nunca dependió de un conteo real (usa fakeDetail(), no una lista de 36), así que solo
  // hacía falta corregir la descripción, no la aserción.
  it('el detalle de las preguntas analizadas solo se muestra al expandir la tarjeta', () => {
    const findDetailSpy = jasmine.createSpy('findDetail').and.returnValue(of([fakeDetail()]));
    const { fixture } = setup({ comparisons: [fakeComparison()], findDetailSpy });

    expect(findDetailSpy).not.toHaveBeenCalled();
    expect(root(fixture).textContent).not.toContain('¿Pregunta de prueba?');

    findButton(root(fixture), 'Ver detalle').click();
    fixture.detectChanges();

    expect(findDetailSpy).toHaveBeenCalledWith('cmp-1');
    expect(root(fixture).textContent).toContain('¿Pregunta de prueba?');
  });
});

describe('ResultsDashboardComponent — detalle sin respuestas (tarea 16.2)', () => {
  it('muestra pregunta, puntuaciones y explicación, nunca el texto de ninguna respuesta', () => {
    // Simula un backend con un bug real que sí incluyera las respuestas en el JSON — el `as unknown`
    // es deliberado, para comprobar que el propio TEMPLATE (no solo el tipo) nunca las interpola.
    const suspiciousDetail = {
      ...fakeDetail(),
      respuesta_usuario_1: 'TEXTO_SECRETO_PROPIO',
      respuesta_usuario_2: 'TEXTO_SECRETO_CANDIDATO',
    } as unknown as ComparisonQuestionDetail;
    const findDetailSpy = jasmine.createSpy('findDetail').and.returnValue(of([suspiciousDetail]));
    const { fixture } = setup({ comparisons: [fakeComparison()], findDetailSpy });

    findButton(root(fixture), 'Ver detalle').click();
    fixture.detectChanges();

    const text = root(fixture).textContent ?? '';
    expect(text).toContain('¿Pregunta de prueba?');
    expect(text).toContain('Explicación de la IA');
    expect(text).not.toContain('TEXTO_SECRETO_PROPIO');
    expect(text).not.toContain('TEXTO_SECRETO_CANDIDATO');
  });
});

/**
 * El botón de "Recalcular compatibilidad" se retira del dashboard a petición explícita de la
 * usuaria (2026-08-19): ya existe un punto de entrada equivalente en `features/settings` (banner
 * "Recalcular compatibilidad ahora", que aparece justo cuando el perfil queda pendiente de
 * recalcular — ver spec `user-settings`), así que tenerlo TAMBIÉN aquí, casi siempre deshabilitado,
 * era redundante. Ver el change de OpenSpec `simplify-dashboard-recalculate`.
 */
describe('ResultsDashboardComponent — sondeo mientras hay comparaciones pendientes (bug real)', () => {
  /**
   * Bug real reportado por la usuaria con captura: tras recalcular (desde Configuración, que
   * navega aquí al terminar), las tarjetas se quedaban con el spinner para siempre — hacía falta
   * un F5 manual para ver los resultados ya calculados. Causa: la única carga (inicial) llegaba
   * antes de que el análisis asíncrono de IA terminara, y nada volvía a refrescar después.
   *
   * `pollIntervalMs` de pocos milisegundos (ver `setup()`/`DASHBOARD_POLL_INTERVAL_MS`) + una
   * espera real corta (`wait()`), no `fakeAsync`/`tick`: este proyecto no carga `zone.js/testing`
   * (confirmado al intentarlo — Karma lo rechaza en tiempo de ejecución), así que la única forma de
   * comprobar que el sondeo periódico de verdad vuelve a pedir datos —y de que para cuando ya no
   * hace falta— es dejar pasar tiempo real, aunque sea mínimo gracias al intervalo acelerado.
   */
  it('vuelve a pedir los datos mientras alguna comparación siga pending/analyzing, y para en cuanto todas terminan', async () => {
    const findMineSpy = jasmine
      .createSpy('findMine')
      .and.returnValues(
        of([fakeComparison({ id: 'cmp-1', status: 'analyzing', result: null })]),
        of([fakeComparison({ id: 'cmp-1', status: 'analyzing', result: null })]),
        of([fakeComparison({ id: 'cmp-1', status: 'completed' })]),
      );
    const { fixture } = setup({ findMineSpy, pollIntervalMs: 15 });
    expect(findMineSpy).toHaveBeenCalledTimes(1); // carga inicial, síncrona
    expect(root(fixture).querySelector('.spinner-border.text-primary')).not.toBeNull();

    await wait(25);
    fixture.detectChanges();
    expect(findMineSpy).toHaveBeenCalledTimes(2); // seguía pendiente: vuelve a pedir sola

    await wait(25);
    fixture.detectChanges();
    expect(findMineSpy).toHaveBeenCalledTimes(3); // esta vez llega completed
    expect(root(fixture).querySelector('.spinner-border.text-primary')).toBeNull();
    expect(root(fixture).textContent).toContain('Compatibilidad:');

    const callsAfterCompleted = findMineSpy.calls.count();
    await wait(25);
    expect(findMineSpy.calls.count()).toBe(callsAfterCompleted); // nada pendiente: no pide de más
  });

  it('con todo ya completado desde el principio, no hace peticiones de sondeo de más', async () => {
    const { fixture, findMineSpy } = setup({
      comparisons: [fakeComparison({ status: 'completed' })],
      pollIntervalMs: 15,
    });
    expect(findMineSpy).toHaveBeenCalledTimes(1);

    await wait(25);
    fixture.detectChanges();

    expect(findMineSpy).toHaveBeenCalledTimes(1);
  });
});

describe('ResultsDashboardComponent — botón "Chatear" (tarea 16.6)', () => {
  it('llama a POST /conversations con el candidato de esa tarjeta y navega a la conversación devuelta', async () => {
    const startConversationSpy = jasmine.createSpy('startConversation').and.returnValue(of({ id: 'conv-99' }));
    const { fixture } = setup({
      comparisons: [fakeComparison({ candidate: fakeCandidate({ id: 'user-42' }) })],
      startConversationSpy,
    });

    findButton(root(fixture), 'Chatear').click();
    await fixture.whenStable();

    expect(startConversationSpy).toHaveBeenCalledWith('user-42');
    expect(TestBed.inject(Router).url).toBe('/chats/conv-99');
  });
});

describe('ResultsDashboardComponent — estados de carga y vacío', () => {
  it('sin comparaciones, muestra un aviso en vez de una card vacía', () => {
    const { fixture } = setup({ comparisons: [] });
    expect(root(fixture).querySelector('.alert-warning')).not.toBeNull();
    expect(cards(fixture).length).toBe(0);
  });
});

describe('ResultsDashboardComponent — indicador de progreso agregado (spec results-dashboard, escenario "Estado de procesamiento antes de completarse")', () => {
  it('muestra "X de Y analizadas" mientras alguna comparación sigue en pending/analyzing', () => {
    const { fixture } = setup({
      comparisons: [
        fakeComparison({ id: 'cmp-1', status: 'completed' }),
        fakeComparison({ id: 'cmp-2', status: 'analyzing', result: null }),
        fakeComparison({ id: 'cmp-3', status: 'pending', result: null }),
      ],
    });

    const badge = root(fixture).querySelector('.badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('1 de 3 analizadas');
  });

  it('no muestra el indicador cuando todas las comparaciones ya han terminado (completed/error)', () => {
    const { fixture } = setup({
      comparisons: [
        fakeComparison({ id: 'cmp-1', status: 'completed' }),
        fakeComparison({ id: 'cmp-2', status: 'error', result: null }),
      ],
    });

    expect(root(fixture).querySelector('.badge')).toBeNull();
  });
});

describe('ResultsDashboardComponent — responsive (tarea 21.5)', () => {
  it('el grid usa columnas responsive (1 en móvil, hasta 3 en escritorio) y el radar chart se configura para adaptarse a su contenedor', () => {
    const { fixture } = setup();
    const row = root(fixture).querySelector('.row');

    // Depende de una media query real del viewport (igual que navbar-expand-md, tarea 21.1) — se
    // comprueba por estructura, no forzando un ancho (eso no engañaría a `@media`).
    expect(row?.classList.contains('row-cols-1')).toBe(true);
    expect(row?.classList.contains('row-cols-md-2')).toBe(true);
    expect(row?.classList.contains('row-cols-lg-3')).toBe(true);

    expect(fixture.componentInstance.chartOptions?.responsive).toBe(true);
    expect(fixture.componentInstance.chartOptions?.maintainAspectRatio).toBe(false);
  });

  it('el radar chart no desborda su contenedor en viewport móvil (~375px)', async () => {
    const { fixture } = setup();
    await expectNoHorizontalOverflow(root(fixture), 375);
  });
});
