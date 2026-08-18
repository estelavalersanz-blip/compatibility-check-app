import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Answer, QUESTIONS } from '@compatibility-check-app/shared-types';
import { firstValueFrom } from 'rxjs';
import { MatchingService } from '../../core/matching.service';
import { QuestionnaireService } from '../../core/questionnaire.service';
import { QuestionNavComponent } from './question-nav.component';

/** 6 bloques de 6 preguntas (design.md decisión 6c) — mismo agrupamiento que `weighting.util.ts` en
 *  el backend (no importable desde el frontend, así que se repite aquí solo el dato de UI). Cadenas,
 *  no números: los nombres de clase CSS de `design-tokens.md` van con 2 dígitos siempre
 *  (`--weight-05`, no `--weight-5`), y así se generan tal cual por concatenación simple. */
const BLOCK_WEIGHT_PERCENTS: readonly [string, string, string, string, string, string] = [
  '05',
  '05',
  '15',
  '20',
  '25',
  '30',
];
const LAST_BLOCK_INDEX = BLOCK_WEIGHT_PERCENTS.length - 1;
const TOTAL_QUESTIONS = 36;

const QUESTION_BY_ID = new Map(QUESTIONS.map((question) => [question.id, question]));

type Mode = 'create' | 'edit';

interface QuestionView {
  id: number;
  text: string;
  answer: string;
  answered: boolean;
}

interface BlockView {
  index: number;
  weightPercent: string;
  questions: QuestionView[];
  answeredCount: number;
}

/**
 * Cuestionario de 36 preguntas (sección 14; design.md decisiones 6c/3h; ui-design-consistency
 * SKILL.md, "Cuestionario: wizard de 6 pasos"). Shell A — "casos especiales" de `page-template.md`:
 * la cabecera de wizard (flecha + barra ponderada + racha) sustituye al `<h1>`/subtítulo estándar, y
 * solo se monta el bloque activo (nunca los 6 a la vez).
 *
 * Reutilizable en modo "creación" (con pantalla de bienvenida previa, `POST` al final, navega a
 * `features/processing`) y "edición" (`?mode=edit`, sin bienvenida, `PATCH` + recálculo encadenados,
 * navega al dashboard) — tarea 14.9.
 */
@Component({
  selector: 'app-questionnaire',
  standalone: true,
  imports: [NgClass, QuestionNavComponent],
  templateUrl: './questionnaire.component.html',
  styleUrl: './questionnaire.component.scss',
})
export class QuestionnaireComponent {
  private readonly questionnaireService = inject(QuestionnaireService);
  private readonly matchingService = inject(MatchingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode: Mode = this.route.snapshot.queryParamMap.get('mode') === 'edit' ? 'edit' : 'create';

  /** Pantalla de bienvenida (decisión 3h): solo relevante en modo creación; empieza en `true` (sin
   *  pasar por ella) en modo edición, para que el `@if` de la plantilla nunca la muestre ahí. */
  readonly started = signal(this.mode === 'edit');
  readonly loading = signal(true);

  /** `questionId -> texto de respuesta`. Objeto inmutable (nunca mutado in-place) para que las
   *  señales derivadas se recalculen correctamente en cada cambio. */
  readonly answers = signal<Record<number, string>>({});

  readonly currentBlockIndex = signal(0);
  readonly maxReachedBlockIndex = signal(0);
  readonly currentQuestionIndex = signal(0);
  readonly maxReachedQuestionIndex = signal(0);

  /** Racha (gamificación, puramente de UI): pico de respondidas-a-la-vez visto EN ESTA sesión — se
   *  reinicia a 0 en cada recarga a propósito, incluso si se prerellenan respuestas previas. */
  readonly streakCount = signal(0);

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly blocks = computed<BlockView[]>(() => {
    const currentAnswers = this.answers();
    return BLOCK_WEIGHT_PERCENTS.map((weightPercent, index) => {
      const blockNumber = index + 1;
      const questions = QUESTIONS.filter((question) => question.block === blockNumber).map(
        (question): QuestionView => {
          const answer = currentAnswers[question.id] ?? '';
          return { id: question.id, text: question.text, answer, answered: answer.trim().length > 0 };
        },
      );
      return {
        index,
        weightPercent,
        questions,
        answeredCount: questions.filter((question) => question.answered).length,
      };
    });
  });

  readonly activeBlock = computed(() => this.blocks()[this.currentBlockIndex()]);
  readonly activeQuestion = computed(() => this.activeBlock().questions[this.currentQuestionIndex()]);

  readonly totalAnsweredCount = computed(
    () => Object.values(this.answers()).filter((value) => value.trim().length > 0).length,
  );
  readonly allAnswered = computed(() => this.totalAnsweredCount() === TOTAL_QUESTIONS);

  readonly reducedMotion = signal(
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  constructor() {
    // Primera carga con suscripción directa, nunca envuelta en un timer/interval (gotcha zoneless ya
    // conocido, ver core/shell/shell.component.ts).
    this.questionnaireService.getAnswers().subscribe({
      next: (existing) => this.applyLoadedAnswers(existing),
      error: () => this.loading.set(false),
    });
  }

  private applyLoadedAnswers(existing: Answer[]): void {
    const record: Record<number, string> = {};
    for (const answer of existing) {
      record[answer.questionId] = answer.answer;
    }
    this.answers.set(record);
    this.loading.set(false);
    this.positionAtFirstIncompleteBlock();
  }

  /** Tarea 14.4: al cargar, posiciona el wizard en el primer bloque incompleto o, si las 36
   *  preguntas ya están respondidas, en el ÚLTIMO bloque (spec `personal-questionnaire`,
   *  "Guardado de respuestas parciales" → "Carga del borrador al iniciar sesión"): aterrizar en
   *  el bloque 1 obligaría a recorrer los 6 bloques ya completos solo para llegar al resumen y al
   *  botón de envío. Todo bloque con progreso (o el de aterrizaje) queda marcado como alcanzado,
   *  para poder revisar libremente lo ya hecho sin tener que volver a pasar bloque a bloque. */
  private positionAtFirstIncompleteBlock(): void {
    const blocksSnapshot = this.blocks();
    const firstIncomplete = blocksSnapshot.findIndex((block) => block.answeredCount < 6);
    const landingIndex = firstIncomplete === -1 ? LAST_BLOCK_INDEX : firstIncomplete;
    const lastWithProgress = this.lastIndexMatching(blocksSnapshot, (block) => block.answeredCount > 0);
    this.maxReachedBlockIndex.set(Math.max(landingIndex, lastWithProgress));
    this.enterBlock(landingIndex);
  }

  private lastIndexMatching<T>(items: readonly T[], predicate: (item: T) => boolean): number {
    for (let i = items.length - 1; i >= 0; i--) {
      if (predicate(items[i])) {
        return i;
      }
    }
    return 0;
  }

  /** Punto único para "entrar" en un bloque (carga inicial, avance, revisión o salto por la barra):
   *  reinicia el estado de navegación de preguntas al ámbito del nuevo bloque activo. */
  private enterBlock(index: number): void {
    this.currentBlockIndex.set(index);
    const block = this.blocks()[index];
    const firstIncompleteQuestion = block.questions.findIndex((question) => !question.answered);
    const landingQuestionIndex = firstIncompleteQuestion === -1 ? 0 : firstIncompleteQuestion;
    const lastAnsweredQuestion = this.lastIndexMatching(block.questions, (question) => question.answered);
    this.currentQuestionIndex.set(landingQuestionIndex);
    this.maxReachedQuestionIndex.set(Math.max(landingQuestionIndex, lastAnsweredQuestion));
  }

  onAnswerInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    const questionId = this.activeQuestion().id;
    this.answers.update((current) => ({ ...current, [questionId]: value }));

    const total = this.totalAnsweredCount();
    if (total > this.streakCount()) {
      this.streakCount.set(total);
    }
  }

  onAnswerBlur(): void {
    this.saveDraft();
  }

  /** Recibe tanto los clics de punto como las flechas prev/next de `QuestionNavComponent` (el hijo
   *  emite el mismo `indexChange` para ambos). Avanzar más allá del máximo alcanzado lo extiende
   *  (igual que `nextBlock()` con los bloques) — sin esto, la flecha "siguiente" quedaría atascada:
   *  `maxReachedQuestionIndex` solo se fijaba al entrar en el bloque, nunca al moverse dentro de él. */
  goToQuestion(index: number): void {
    this.currentQuestionIndex.set(index);
    if (index > this.maxReachedQuestionIndex()) {
      this.maxReachedQuestionIndex.set(index);
    }
  }

  /** Flecha de la cabecera: retrocede un bloque, o sale del cuestionario en el bloque 1 (tarea 14.1).
   *  Navega a "/" y deja que `mainRouteGuard` decida el destino (cuestionario de nuevo en modo
   *  creación — no se puede saltar la primera vez —, o el dashboard en modo edición), sin duplicar
   *  esa lógica de resolución aquí. */
  previousBlock(): void {
    this.saveDraft();
    if (this.currentBlockIndex() === 0) {
      void this.router.navigate(['/']);
      return;
    }
    this.enterBlock(this.currentBlockIndex() - 1);
  }

  /** Botón "Siguiente bloque" (bloques 1-5): avanza de verdad la primera vez (mueve
   *  `maxReachedBlockIndex`), o vuelve a `maxReachedBlockIndex` si se estaba revisando uno anterior
   *  ("Volver a donde estabas") — nunca retrocede el máximo alcanzado. */
  private nextBlock(): void {
    this.saveDraft();
    if (this.currentBlockIndex() < this.maxReachedBlockIndex()) {
      this.enterBlock(this.maxReachedBlockIndex());
      return;
    }
    const next = this.currentBlockIndex() + 1;
    this.maxReachedBlockIndex.set(next);
    this.enterBlock(next);
  }

  /** Tramos de la barra de progreso ya visitados (tarea 14.3b): salta directo a revisar/editar. */
  goToBlock(index: number): void {
    if (index > this.maxReachedBlockIndex()) {
      return;
    }
    this.saveDraft();
    this.enterBlock(index);
  }

  footerButtonLabel(): string {
    if (this.currentBlockIndex() < this.maxReachedBlockIndex()) {
      return 'Volver a donde estabas';
    }
    if (this.currentBlockIndex() < LAST_BLOCK_INDEX) {
      return 'Siguiente bloque';
    }
    return this.mode === 'edit' ? 'Guardar y recalcular compatibilidad' : 'Enviar cuestionario';
  }

  /** Tarea 14.5: en los bloques 1-5 nunca se deshabilita por respuestas pendientes — solo el botón
   *  de envío/guardado final del bloque 6 exige las 36 completas. */
  footerButtonDisabled(): boolean {
    return this.currentBlockIndex() === LAST_BLOCK_INDEX && !this.allAnswered();
  }

  /** `async` a propósito, no `void this.submitLastBlock()` fire-and-forget: la plantilla la llama
   *  directamente ((click)="onFooterButtonClick()"), y Angular solo rastrea para `ApplicationRef`/
   *  `whenStable()` la promesa que devuelve DE VERDAD el propio manejador del evento de plantilla —
   *  un `void` intermedio la desconecta y las peticiones fetch/navegación quedan invisibles para los
   *  tests (visto de verdad: sin esto, `fixture.whenStable()` no esperaba a que terminase el envío
   *  final, mismo patrón que ya usa `RegistrationComponent.submit()`). */
  async onFooterButtonClick(): Promise<void> {
    if (this.currentBlockIndex() === LAST_BLOCK_INDEX) {
      await this.submitLastBlock();
      return;
    }
    this.nextBlock();
  }

  progressCopy(): string {
    const count = this.totalAnsweredCount();
    if (count === TOTAL_QUESTIONS) {
      return '¡Cuestionario completo!';
    }
    if (count >= 24) {
      return 'Ya casi';
    }
    if (count >= 12) {
      return 'Vas por la mitad';
    }
    return 'Vamos empezando';
  }

  private buildAnswerPayload(): Answer[] {
    return Object.entries(this.answers())
      .filter(([, value]) => value.trim().length > 0)
      .map(([id, value]) => {
        const questionId = Number(id);
        return { questionId, question: QUESTION_BY_ID.get(questionId)!.text, answer: value };
      });
  }

  private saveDraft(): void {
    this.questionnaireService.saveDraft(this.buildAnswerPayload()).subscribe({ error: () => undefined });
  }

  /** Tarea 14.5b: modo edición encadena `PATCH` + recálculo en una sola acción y navega al
   *  dashboard; modo creación llama solo al envío final y navega a `features/processing`. */
  private async submitLastBlock(): Promise<void> {
    if (!this.allAnswered()) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    const payload = this.buildAnswerPayload();
    try {
      if (this.mode === 'edit') {
        await firstValueFrom(this.questionnaireService.update(payload));
        await firstValueFrom(this.matchingService.recalculate());
        await this.router.navigate(['/dashboard']);
      } else {
        await firstValueFrom(this.questionnaireService.complete(payload));
        await this.router.navigate(['/processing']);
      }
    } catch {
      this.submitError.set('No se pudo guardar el cuestionario. Inténtalo de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }
}
