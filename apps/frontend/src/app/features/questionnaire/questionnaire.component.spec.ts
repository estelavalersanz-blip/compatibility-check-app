import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Answer, QUESTIONS } from '@compatibility-check-app/shared-types';
import { of, throwError } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthService } from '../../core/auth.service';
import { ChatService } from '../../core/chat.service';
import { MatchingService } from '../../core/matching.service';
import { QuestionnaireService } from '../../core/questionnaire.service';
import { fakeAuthService, fakeChatService, fakeUsersService } from '../../core/testing/fakes';
import { UsersService } from '../../core/users.service';
import { QuestionnaireComponent } from './questionnaire.component';

@Component({ selector: 'app-questionnaire-test-blank', standalone: true, template: '' })
class BlankComponent {}

function answersFor(ids: number[]): Answer[] {
  return ids.map((id) => {
    const question = QUESTIONS.find((q) => q.id === id);
    if (!question) {
      throw new Error(`La pregunta ${id} no existe en el catálogo`);
    }
    return { questionId: id, question: question.text, answer: `Respuesta a la pregunta ${id}` };
  });
}

function idsUpTo(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function fakeMatchMedia(matches: boolean): MediaQueryList {
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  } as MediaQueryList;
}

function setup(
  options: {
    mode?: 'create' | 'edit';
    existingAnswers?: Answer[];
    getAnswersError?: boolean;
    completeSpy?: jasmine.Spy;
    updateSpy?: jasmine.Spy;
    saveDraftSpy?: jasmine.Spy;
    recalculateSpy?: jasmine.Spy;
  } = {},
) {
  const getAnswersSpy = jasmine
    .createSpy('getAnswers')
    .and.returnValue(
      options.getAnswersError ? throwError(() => new Error('boom')) : of(options.existingAnswers ?? []),
    );
  const saveDraftSpy = options.saveDraftSpy ?? jasmine.createSpy('saveDraft').and.returnValue(of([]));
  const completeSpy = options.completeSpy ?? jasmine.createSpy('complete').and.returnValue(of([]));
  const updateSpy = options.updateSpy ?? jasmine.createSpy('update').and.returnValue(of([]));
  const recalculateSpy = options.recalculateSpy ?? jasmine.createSpy('recalculate').and.returnValue(of({}));

  TestBed.configureTestingModule({
    imports: [QuestionnaireComponent],
    providers: [
      provideRouter([
        { path: '', component: BlankComponent },
        { path: 'dashboard', component: BlankComponent },
        { path: 'processing', component: BlankComponent },
      ]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(options.mode === 'edit' ? { mode: 'edit' } : {}),
          },
        },
      },
      {
        provide: QuestionnaireService,
        useValue: {
          getAnswers: getAnswersSpy,
          saveDraft: saveDraftSpy,
          complete: completeSpy,
          update: updateSpy,
        },
      },
      { provide: MatchingService, useValue: { recalculate: recalculateSpy } },
    ],
  });

  const fixture = TestBed.createComponent(QuestionnaireComponent);
  fixture.detectChanges();
  return { fixture, getAnswersSpy, saveDraftSpy, completeSpy, updateSpy, recalculateSpy };
}

function root(fixture: ComponentFixture<QuestionnaireComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function start(fixture: ComponentFixture<QuestionnaireComponent>): void {
  root(fixture).querySelector<HTMLButtonElement>('button')?.click();
  fixture.detectChanges();
}

function getTextarea(fixture: ComponentFixture<QuestionnaireComponent>): HTMLTextAreaElement {
  const textarea = root(fixture).querySelector<HTMLTextAreaElement>('textarea');
  if (!textarea) {
    throw new Error('No se encontró el textarea de la pregunta activa');
  }
  return textarea;
}

function typeActiveAnswer(fixture: ComponentFixture<QuestionnaireComponent>, text: string): void {
  const textarea = getTextarea(fixture);
  textarea.value = text;
  textarea.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

function blurActiveAnswer(fixture: ComponentFixture<QuestionnaireComponent>): void {
  getTextarea(fixture).dispatchEvent(new Event('blur'));
  fixture.detectChanges();
}

function clickArrow(fixture: ComponentFixture<QuestionnaireComponent>, label: string): void {
  root(fixture).querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)?.click();
  fixture.detectChanges();
}

/** Rellena las 6 preguntas del bloque activo, de una en una, avanzando con la flecha "Siguiente
 *  pregunta" — no exige ningún orden ni conocer los ids reales de las preguntas. */
function fillActiveBlockCompletely(fixture: ComponentFixture<QuestionnaireComponent>): void {
  for (let i = 0; i < 6; i++) {
    typeActiveAnswer(fixture, `respuesta ${i}`);
    if (i < 5) {
      clickArrow(fixture, 'Siguiente pregunta');
    }
  }
}

function segments(fixture: ComponentFixture<QuestionnaireComponent>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.quest-progress__segment'));
}

function dots(fixture: ComponentFixture<QuestionnaireComponent>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.question-nav__dot'));
}

function footerButton(fixture: ComponentFixture<QuestionnaireComponent>): HTMLButtonElement {
  const button = root(fixture).querySelector<HTMLButtonElement>('.card-footer button');
  if (!button) {
    throw new Error('No se encontró el botón del card-footer');
  }
  return button;
}

function clickFooterButton(fixture: ComponentFixture<QuestionnaireComponent>): void {
  footerButton(fixture).click();
  fixture.detectChanges();
}

function blockHeaderText(fixture: ComponentFixture<QuestionnaireComponent>): string {
  return root(fixture).querySelector('.card-header')?.textContent?.trim() ?? '';
}

describe('QuestionnaireComponent — pantalla de bienvenida (tarea 14.0)', () => {
  it('en modo creación, muestra la bienvenida antes del bloque 1 y da paso al wizard al pulsar "Iniciar"', () => {
    const { fixture } = setup({ mode: 'create' });
    const before = root(fixture);
    expect(before.querySelector('h1')?.textContent).toContain('Cuestionario de compatibilidad');
    expect(before.querySelector('button')?.textContent?.trim()).toBe('Iniciar');
    expect(before.querySelector('textarea')).toBeNull();

    start(fixture);

    expect(root(fixture).querySelector('textarea')).not.toBeNull();
    expect(root(fixture).querySelector('h1')).toBeNull();
  });

  it('en modo edición, nunca se muestra la bienvenida: entra directo al wizard ya prerellenado', () => {
    const { fixture } = setup({ mode: 'edit', existingAnswers: answersFor(idsUpTo(36)) });
    const view = root(fixture);
    expect(view.textContent).not.toContain('Cuestionario de compatibilidad');
    expect(view.querySelector('textarea')).not.toBeNull();
  });
});

describe('QuestionnaireComponent — wizard de 6 bloques (tarea 14.1)', () => {
  it('monta un único bloque a la vez (un solo textarea, nunca 36 preguntas a la vez)', () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);
    expect(root(fixture).querySelectorAll('textarea').length).toBe(1);
    expect(root(fixture).querySelectorAll('.card').length).toBe(1);
  });

  it('la flecha de volver, en el bloque 1, sale del cuestionario', async () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);

    clickArrow(fixture, 'Salir del cuestionario');
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('la flecha de volver, a partir del bloque 2, retrocede un bloque sin exigir que esté completo', () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);
    clickFooterButton(fixture); // avanza al bloque 2 sin responder nada del bloque 1

    expect(blockHeaderText(fixture)).toContain('Bloque 2');

    clickArrow(fixture, 'Bloque anterior');

    expect(blockHeaderText(fixture)).toContain('Bloque 1');
  });
});

describe('QuestionnaireComponent — barra de progreso ponderada (tarea 14.2)', () => {
  it('muestra 6 segmentos, los bloques 1 y 2 (mismo peso) con la misma clase, sin peso como texto', () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);

    const bars = segments(fixture);
    expect(bars.length).toBe(6);
    expect(bars[0].className).toContain('quest-progress__segment--weight-05');
    expect(bars[1].className).toContain('quest-progress__segment--weight-05');
    expect(bars[2].className).toContain('quest-progress__segment--weight-15');
    expect(bars[3].className).toContain('quest-progress__segment--weight-20');
    expect(bars[4].className).toContain('quest-progress__segment--weight-25');
    expect(bars[5].className).toContain('quest-progress__segment--weight-30');
    for (const segment of bars) {
      expect(segment.textContent?.trim()).toBe('');
    }
  });

  it('el relleno de cada segmento es proporcional a sus preguntas respondidas', () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);

    typeActiveAnswer(fixture, 'una respuesta');
    blurActiveAnswer(fixture);

    // parseFloat, no comparación de string exacta: el navegador normaliza los decimales de
    // `style.width` al asignarlo (16.666666666666664% en JS, "16.6667%" ya en el DOM).
    const fill = root(fixture).querySelector<HTMLElement>('.quest-progress__fill');
    expect(parseFloat(fill?.style.width ?? '0')).toBeCloseTo((1 / 6) * 100, 2);
  });
});

describe('QuestionnaireComponent — gradiente por peso y check de bloque completado (tarea 14.3)', () => {
  it('el card-header del bloque activo aplica la clase question-block--weight-XX según su peso', () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);

    const header = root(fixture).querySelector('.card-header');
    expect(header?.className).toContain('question-block--weight-05');
  });

  it('un bloque completado (6/6) por el que ya se avanzó queda marcado con un check', () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);

    fillActiveBlockCompletely(fixture);
    clickFooterButton(fixture); // avanza de verdad al bloque 2

    const bars = segments(fixture);
    expect(bars[0].querySelector('.quest-progress__check')).not.toBeNull();
    expect(bars[1].querySelector('.quest-progress__check')).toBeNull();
  });
});

describe('QuestionnaireComponent — revisar bloques ya visitados (tarea 14.3b)', () => {
  it('un tramo visitado navega directo a revisarlo; uno no alcanzado no es clicable', () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);
    clickFooterButton(fixture); // bloque 1 -> 2
    clickFooterButton(fixture); // bloque 2 -> 3

    expect(blockHeaderText(fixture)).toContain('Bloque 3');
    expect(segments(fixture)[3].disabled).toBe(true); // bloque 4, no alcanzado

    segments(fixture)[0].click();
    fixture.detectChanges();

    expect(blockHeaderText(fixture)).toContain('Bloque 1');
  });

  it('al revisar, el botón cambia a "Volver a donde estabas" y regresa al más avanzado, no al siguiente', () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);
    clickFooterButton(fixture); // bloque 1 -> 2
    clickFooterButton(fixture); // bloque 2 -> 3
    segments(fixture)[0].click(); // revisar el bloque 1
    fixture.detectChanges();

    expect(footerButton(fixture).textContent?.trim()).toBe('Volver a donde estabas');

    clickFooterButton(fixture);

    expect(blockHeaderText(fixture)).toContain('Bloque 3'); // el más avanzado, no el bloque 2
  });
});

describe('QuestionnaireComponent — prerellenado y autoguardado (tarea 14.4)', () => {
  it('prerellena las respuestas guardadas y posiciona el wizard en el primer bloque incompleto', () => {
    const { fixture } = setup({ mode: 'create', existingAnswers: answersFor([1, 2, 3, 4, 5, 6, 7, 8]) });
    start(fixture);

    expect(blockHeaderText(fixture)).toContain('Bloque 2'); // bloque 1 completo, bloque 2 el primero incompleto
    expect(dots(fixture)[0].classList.contains('question-nav__dot--answered')).toBe(true);
    expect(dots(fixture)[1].classList.contains('question-nav__dot--answered')).toBe(true);
    expect(dots(fixture)[2].classList.contains('question-nav__dot--answered')).toBe(false);
    // Aterriza justo en la primera pregunta sin responder del bloque (índice 2, la 3ª)
    expect(dots(fixture)[2].disabled).toBe(false); // es la actual, alcanzable
    expect(dots(fixture)[5].disabled).toBe(true); // no visitada todavía

    // El bloque 1, ya completo, sigue siendo revisable desde la barra
    expect(segments(fixture)[0].disabled).toBe(false);
  });

  it('con el cuestionario completo (modo edición), no hay bloque incompleto y aterriza en el bloque 1', () => {
    const { fixture } = setup({ mode: 'edit', existingAnswers: answersFor(idsUpTo(36)) });
    expect(blockHeaderText(fixture)).toContain('Bloque 1');
  });

  it('autoguarda contra PUT .../draft al perder el foco y al cambiar de bloque', () => {
    const { fixture, saveDraftSpy } = setup({ mode: 'create' });
    start(fixture);
    saveDraftSpy.calls.reset();

    typeActiveAnswer(fixture, 'mi respuesta');
    expect(saveDraftSpy).not.toHaveBeenCalled(); // no en cada pulsación, solo al perder el foco

    blurActiveAnswer(fixture);
    expect(saveDraftSpy).toHaveBeenCalledTimes(1);
    const payload = saveDraftSpy.calls.mostRecent().args[0] as Answer[];
    expect(payload.some((answer) => answer.answer === 'mi respuesta')).toBe(true);

    clickFooterButton(fixture); // cambiar de bloque también autoguarda
    expect(saveDraftSpy).toHaveBeenCalledTimes(2);
  });
});

describe('QuestionnaireComponent — botón del bloque activo (tarea 14.5)', () => {
  it('en los bloques 1-5, "Siguiente bloque" nunca se deshabilita por respuestas pendientes', () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);

    expect(footerButton(fixture).textContent?.trim()).toBe('Siguiente bloque');
    expect(footerButton(fixture).disabled).toBe(false);
  });

  it('en el bloque 6 (modo creación), dice "Enviar cuestionario" y exige las 36 respuestas', () => {
    const { fixture } = setup({ mode: 'create', existingAnswers: answersFor(idsUpTo(35)) });
    start(fixture);

    expect(blockHeaderText(fixture)).toContain('Bloque 6'); // 35/36: el bloque 6 es el primero incompleto
    expect(footerButton(fixture).textContent?.trim()).toBe('Enviar cuestionario');
    expect(footerButton(fixture).disabled).toBe(true);

    typeActiveAnswer(fixture, 'la última respuesta'); // completa la pregunta 36, la que faltaba

    expect(footerButton(fixture).disabled).toBe(false);
  });

  it('en el bloque 6 (modo edición), dice "Guardar y recalcular compatibilidad"', () => {
    const { fixture } = setup({ mode: 'edit', existingAnswers: answersFor(idsUpTo(36)) });
    segments(fixture)[5].click(); // saltar directo al bloque 6 (ya alcanzado: todo está completo)
    fixture.detectChanges();

    expect(blockHeaderText(fixture)).toContain('Bloque 6');
    expect(footerButton(fixture).textContent?.trim()).toBe('Guardar y recalcular compatibilidad');
    expect(footerButton(fixture).disabled).toBe(false);
  });
});

describe('QuestionnaireComponent — envío final según el modo (tarea 14.5b)', () => {
  it('modo creación: solo llama a POST y navega a features/processing', async () => {
    const { fixture, completeSpy, updateSpy, recalculateSpy } = setup({
      mode: 'create',
      existingAnswers: answersFor(idsUpTo(35)),
    });
    start(fixture);
    typeActiveAnswer(fixture, 'la última respuesta');

    // Sin `detectChanges()` intercalado entre el click y `whenStable()` (a diferencia del helper
    // `clickFooterButton`): un `detectChanges()` síncrono justo después del click, mientras la
    // promesa async del manejador todavía no se ha resuelto, hace que `whenStable()` deje de
    // esperarla — mismo patrón que ya usan login/register para su envío con navegación.
    footerButton(fixture).click();
    await fixture.whenStable();

    expect(completeSpy).toHaveBeenCalledTimes(1);
    expect((completeSpy.calls.mostRecent().args[0] as Answer[]).length).toBe(36);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(recalculateSpy).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/processing');
  });

  it('modo edición: encadena PATCH y luego POST /recalculate (sin paso manual), navega al dashboard', async () => {
    const calls: string[] = [];
    const updateSpy = jasmine.createSpy('update').and.callFake(() => {
      calls.push('update');
      return of([]);
    });
    const recalculateSpy = jasmine.createSpy('recalculate').and.callFake(() => {
      calls.push('recalculate');
      return of({});
    });
    const { fixture, completeSpy } = setup({
      mode: 'edit',
      existingAnswers: answersFor(idsUpTo(36)),
      updateSpy,
      recalculateSpy,
    });
    segments(fixture)[5].click();
    fixture.detectChanges();

    // Igual que arriba: sin `detectChanges()` entre el click y `whenStable()`.
    footerButton(fixture).click();
    await fixture.whenStable();

    expect(calls).toEqual(['update', 'recalculate']);
    expect(completeSpy).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });
});

describe('QuestionnaireComponent — navegación entre las 6 preguntas del bloque activo (tarea 14.6)', () => {
  it('cada punto refleja si su pregunta está respondida y solo se puede saltar a una ya visitada', () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);

    expect(dots(fixture).length).toBe(6);
    expect(dots(fixture)[1].disabled).toBe(true); // aún no visitada

    typeActiveAnswer(fixture, 'respuesta 1');
    clickArrow(fixture, 'Siguiente pregunta');

    expect(dots(fixture)[0].classList.contains('question-nav__dot--answered')).toBe(true);
    expect(dots(fixture)[1].disabled).toBe(false); // ya alcanzada al avanzar con la flecha

    dots(fixture)[0].click();
    fixture.detectChanges();

    expect(root(fixture).querySelector('.question-pane label')?.textContent).toBe(
      QUESTIONS.find((q) => q.block === 1)?.text,
    );
  });

  it('el cambio de pregunta aplica la transición, salvo con prefers-reduced-motion: reduce simulado', () => {
    spyOn(window, 'matchMedia').and.returnValue(fakeMatchMedia(true));
    const { fixture } = setup({ mode: 'create' });
    start(fixture);

    expect(root(fixture).querySelector('.question-pane')).not.toBeNull();
    expect(root(fixture).querySelector('.question-pane--reduced-motion')).not.toBeNull();

    // El cambio de pregunta sigue funcionando igual, solo sin la animación.
    clickArrow(fixture, 'Siguiente pregunta');
    expect(root(fixture).querySelector('.question-pane')).not.toBeNull();
  });
});

describe('QuestionnaireComponent — textarea a ancho completo (tarea 14.7)', () => {
  it('el textarea de la pregunta activa ocupa el 100% del ancho y tiene al menos 4 filas', () => {
    const { fixture } = setup({ mode: 'create' });
    start(fixture);

    const textarea = getTextarea(fixture);
    expect(textarea.classList.contains('w-100')).toBe(true);
    expect(Number(textarea.getAttribute('rows'))).toBeGreaterThanOrEqual(4);
  });
});

describe('QuestionnaireComponent — carga de respuestas fallida', () => {
  it('no bloquea el wizard si GET /users/me/questionnaire falla: arranca sin respuestas previas', () => {
    const { fixture } = setup({ mode: 'create', getAnswersError: true });
    start(fixture);

    expect(root(fixture).querySelector('textarea')).not.toBeNull();
    expect(blockHeaderText(fixture)).toContain('Bloque 1');
  });
});

describe('QuestionnaireComponent — navegación contra la tabla de rutas real (regresión)', () => {
  // Cada test de arriba provee su propia tabla de rutas aislada (matching el patrón ya establecido
  // en otros specs) — eso valida la lógica del componente, pero NUNCA ejercita `app.routes.ts` real,
  // así que un `router.navigate(['/processing'])` hacia una ruta inexistente pasaría inadvertido.
  // Encontrado de verdad así: `NG04002: 'processing'` en el navegador — la ruta nunca se había
  // añadido a `app.routes.ts` (la sección 11 solo scaffoldeó las 5 rutas ya conocidas entonces).
  it('el envío final en modo creación navega a una ruta que de verdad existe ("/processing")', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: fakeAuthService(true) },
        { provide: ChatService, useValue: fakeChatService() },
        {
          provide: UsersService,
          useValue: fakeUsersService({
            id: 'user-1',
            name: 'Ada',
            alias: 'ada',
            photoUrl: null,
            questionnaireCompletedAt: null,
            needsRecalculation: false,
            qualityIds: [],
          }),
        },
        {
          provide: QuestionnaireService,
          useValue: {
            getAnswers: () => of(answersFor(idsUpTo(36))),
            saveDraft: () => of([]),
            complete: () => of([]),
            update: () => of([]),
          },
        },
        { provide: MatchingService, useValue: { recalculate: () => of({}) } },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/questionnaire');
    harness.detectChanges();

    const view = harness.fixture.nativeElement as HTMLElement;
    // "Iniciar" específicamente, no el primer <button> del DOM: ese es "Abrir menú" del navbar de
    // Shell A, que vive fuera del <router-outlet> y precede a cualquier botón de la propia pantalla.
    Array.from(view.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === 'Iniciar')
      ?.click();
    harness.detectChanges();
    Array.from(view.querySelectorAll<HTMLButtonElement>('.quest-progress__segment'))[5].click();
    harness.detectChanges();
    view.querySelector<HTMLButtonElement>('.card-footer button')?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/processing');
  });
});
