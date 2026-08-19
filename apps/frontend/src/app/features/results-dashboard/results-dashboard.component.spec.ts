import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  AggregatedResult,
  ComparisonQuestionDetail,
  ComparisonSummary,
  OwnUserProfile,
  UserProfile,
} from '@compatibility-check-app/shared-types';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { of } from 'rxjs';
import { ChatService } from '../../core/chat.service';
import { ComparisonsService } from '../../core/comparisons.service';
import { MatchingService } from '../../core/matching.service';
import { expectNoHorizontalOverflow } from '../../core/testing/no-horizontal-overflow';
import { UsersService } from '../../core/users.service';
import { ResultsDashboardComponent } from './results-dashboard.component';

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

function ownProfile(overrides: Partial<OwnUserProfile> = {}): OwnUserProfile {
  return {
    id: 'user-1',
    name: 'Ada',
    alias: 'ada',
    photoUrl: null,
    questionnaireCompletedAt: '2024-01-01T00:00:00.000Z',
    needsRecalculation: false,
    qualityIds: [],
    ...overrides,
  };
}

function setup(
  options: {
    findMineSpy?: jasmine.Spy;
    comparisons?: ComparisonSummary[];
    getOwnProfileSpy?: jasmine.Spy;
    needsRecalculation?: boolean;
    findDetailSpy?: jasmine.Spy;
    recalculateSpy?: jasmine.Spy;
    startConversationSpy?: jasmine.Spy;
  } = {},
) {
  const findMineSpy =
    options.findMineSpy ?? jasmine.createSpy('findMine').and.returnValue(of(options.comparisons ?? [fakeComparison()]));
  const findDetailSpy = options.findDetailSpy ?? jasmine.createSpy('findDetail').and.returnValue(of([]));
  const getOwnProfileSpy =
    options.getOwnProfileSpy ??
    jasmine.createSpy('getOwnProfile').and.returnValue(of(ownProfile({ needsRecalculation: options.needsRecalculation ?? false })));
  const recalculateSpy = options.recalculateSpy ?? jasmine.createSpy('recalculate').and.returnValue(of({}));
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
      {
        provide: UsersService,
        useValue: { getOwnProfile: getOwnProfileSpy, invalidateOwnProfile: () => undefined },
      },
      { provide: MatchingService, useValue: { recalculate: recalculateSpy } },
      { provide: ChatService, useValue: { startConversation: startConversationSpy } },
    ],
  });

  const fixture = TestBed.createComponent(ResultsDashboardComponent);
  fixture.detectChanges();
  return { fixture, findMineSpy, findDetailSpy, getOwnProfileSpy, recalculateSpy, startConversationSpy };
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

describe('ResultsDashboardComponent — recalcular compatibilidad (tarea 16.4)', () => {
  it('el botón está deshabilitado cuando needsRecalculation es false', () => {
    const { fixture } = setup({ needsRecalculation: false });
    expect(findButton(root(fixture), 'Recalcular compatibilidad').disabled).toBe(true);
  });

  it('habilitado cuando es true; tras completarse el recálculo, se refresca con las nuevas tarjetas', async () => {
    const getOwnProfileSpy = jasmine
      .createSpy('getOwnProfile')
      .and.returnValues(of(ownProfile({ needsRecalculation: true })), of(ownProfile({ needsRecalculation: false })));
    const findMineSpy = jasmine
      .createSpy('findMine')
      .and.returnValues(
        of([fakeComparison({ id: 'cmp-old', candidate: fakeCandidate({ alias: 'candidata-vieja' }) })]),
        of([fakeComparison({ id: 'cmp-new', candidate: fakeCandidate({ alias: 'candidata-nueva' }) })]),
      );
    const { fixture, recalculateSpy } = setup({ getOwnProfileSpy, findMineSpy });
    const button = findButton(root(fixture), 'Recalcular compatibilidad');
    expect(button.disabled).toBe(false);
    expect(root(fixture).textContent).toContain('candidata-vieja');

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(recalculateSpy).toHaveBeenCalledTimes(1);
    expect(findMineSpy).toHaveBeenCalledTimes(2);
    expect(root(fixture).textContent).toContain('candidata-nueva');
    expect(root(fixture).textContent).not.toContain('candidata-vieja');
    expect(findButton(root(fixture), 'Recalcular compatibilidad').disabled).toBe(true);
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
