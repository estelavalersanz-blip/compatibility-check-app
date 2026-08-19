import { Component, DestroyRef, InjectionToken, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  ComparisonQuestionDetail,
  ComparisonSummary,
  Dimension,
  DIMENSIONS,
} from '@compatibility-check-app/shared-types';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { firstValueFrom, interval } from 'rxjs';
import { ChatService } from '../../core/chat.service';
import { ComparisonsService } from '../../core/comparisons.service';

/** Etiquetas legibles para el radar chart — las claves en sí (`emocional`, `valores`, ...) son las
 *  mismas de `AggregatedResult`/`ComparisonQuestionDetail`, sin traducir en ningún otro sitio. */
const DIMENSION_LABELS: Record<Dimension, string> = {
  emocional: 'Emocional',
  valores: 'Valores',
  estilo: 'Estilo',
  intereses: 'Intereses',
  madurez: 'Madurez',
  apertura: 'Apertura',
};

/**
 * Sondeo mientras quede alguna comparación en `pending`/`analyzing` (bug real reportado por la
 * usuaria con captura: tras recalcular, las tarjetas se quedaban con el spinner para siempre — la
 * única carga (inicial) llegaba antes de que el análisis asíncrono de IA terminara, y nada volvía a
 * refrescar hasta un F5 manual). Mismo valor que `features/processing` (3s) en producción: aquí
 * también hay alguien mirando spinners en vivo, no un contador de fondo como el de `core/shell`.
 *
 * `InjectionToken` con `factory` (mismo patrón que `core/supabase-client.ts`), no una constante
 * literal como en el resto de componentes de este proyecto: a diferencia de esos sondeos, el fix de
 * ESTE bug es el propio sondeo periódico, así que su test sí necesita avanzar el reloj de verdad —
 * y esperar 3s reales por test sería lento y fea. El test sobrescribe este token con un valor de
 * milisegundos mínimo; producción nunca lo hace, así que cae siempre en la `factory` de abajo.
 */
export const DASHBOARD_POLL_INTERVAL_MS = new InjectionToken<number>('DASHBOARD_POLL_INTERVAL_MS', {
  providedIn: 'root',
  factory: () => 3000,
});

interface CardView extends ComparisonSummary {
  expanded: boolean;
  detail: ComparisonQuestionDetail[] | null;
  detailLoading: boolean;
  detailError: boolean;
}

/**
 * Dashboard de resultados (sección 16). Grid de tarjetas (page-template.md, "casos especiales": el
 * dashboard no sigue el patrón de una única card) ordenadas de mayor a menor
 * `compatibilidad_final` — cada una con el alias del candidato (nunca el nombre), un radar chart de
 * las 6 dimensiones y un detalle expandible opcional que nunca muestra el texto de ninguna
 * respuesta, ni siquiera si el objeto recibido llegara a incluirla (defensa en profundidad: el
 * template solo interpola campos concretos por nombre, nunca vuelca el objeto entero).
 */
@Component({
  selector: 'app-results-dashboard',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './results-dashboard.component.html',
  styleUrl: './results-dashboard.component.scss',
})
export class ResultsDashboardComponent {
  private readonly comparisonsService = inject(ComparisonsService);
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pollIntervalMs = inject(DASHBOARD_POLL_INTERVAL_MS);

  readonly dimensions = DIMENSIONS;

  readonly loading = signal(true);
  readonly comparisons = signal<CardView[]>([]);
  readonly chatError = signal<string | null>(null);

  /** Spec `results-dashboard`, escenario "Estado de procesamiento antes de completarse": mientras
   *  quede alguna comparación en `pending`/`analyzing`, el dashboard debe mostrar cuántas ya han
   *  terminado en vez de dejar solo los spinners individuales de cada tarjeta sin ningún conteo
   *  agregado. Se calcula aquí (no en la plantilla) para no repetir el filtro dos veces; `null`
   *  cuando ya no queda ninguna pendiente, así el `@if` de la plantilla decide con un solo valor. */
  readonly progressLabel = computed<string | null>(() => {
    const all = this.comparisons();
    const finished = all.filter((card) => card.status === 'completed' || card.status === 'error').length;
    return finished === all.length ? null : `${finished} de ${all.length} analizadas`;
  });

  readonly chartOptions: ChartConfiguration<'radar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { r: { min: 1, max: 10 } },
  };

  constructor() {
    // Primera carga con suscripción directa, nunca envuelta en un timer/interval (gotcha zoneless
    // ya conocido, ver core/shell/shell.component.ts) — el sondeo periódico va aparte, más abajo.
    this.fetchComparisons();

    // El intervalo corre siempre (como el sondeo de no leídos de `core/shell`), pero `fetchComparisons`
    // solo hace una petición real mientras `hasPendingComparisons()` sea cierto — una vez todo está en
    // `completed`/`error` se vuelve un no-op barato en vez de seguir pidiendo datos que ya no cambian.
    // El intervalo corre siempre (como el sondeo de no leídos de `core/shell`), pero `fetchComparisons`
    // solo hace una petición real mientras `hasPendingComparisons()` sea cierto — una vez todo está en
    // `completed`/`error` se vuelve un no-op barato en vez de seguir pidiendo datos que ya no cambian.
    interval(this.pollIntervalMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.hasPendingComparisons()) {
          this.fetchComparisons();
        }
      });
  }

  private hasPendingComparisons(): boolean {
    return this.comparisons().some((card) => card.status === 'pending' || card.status === 'analyzing');
  }

  private fetchComparisons(): void {
    this.comparisonsService.findMine().subscribe({
      next: (list) => {
        this.comparisons.set(sortByCompatibility(list));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  chartDataFor(card: CardView): ChartData<'radar'> {
    const result = card.result;
    return {
      labels: this.dimensions.map((dimension) => DIMENSION_LABELS[dimension]),
      datasets: [
        {
          data: this.dimensions.map((dimension) => result?.[dimension] ?? 0),
          label: 'Compatibilidad',
          backgroundColor: 'rgba(251, 133, 0, 0.2)',
          borderColor: '#FB8500',
          pointBackgroundColor: '#FB8500',
        },
      ],
    };
  }

  toggleExpanded(comparisonId: string): void {
    const target = this.comparisons().find((card) => card.id === comparisonId);
    if (!target) {
      return;
    }
    const nextExpanded = !target.expanded;
    this.updateCard(comparisonId, { expanded: nextExpanded });
    if (nextExpanded && target.detail === null && !target.detailLoading) {
      this.loadDetail(comparisonId);
    }
  }

  private loadDetail(comparisonId: string): void {
    this.updateCard(comparisonId, { detailLoading: true, detailError: false });
    this.comparisonsService.findDetail(comparisonId).subscribe({
      next: (detail) => this.updateCard(comparisonId, { detail, detailLoading: false }),
      error: () => this.updateCard(comparisonId, { detailLoading: false, detailError: true }),
    });
  }

  private updateCard(comparisonId: string, changes: Partial<CardView>): void {
    this.comparisons.update((current) =>
      current.map((card) => (card.id === comparisonId ? { ...card, ...changes } : card)),
    );
  }

  /** Tarea 16.6/16.7: idempotente en el backend — la UI nunca decide si crea o reutiliza. */
  async startChat(candidateUserId: string): Promise<void> {
    this.chatError.set(null);
    try {
      const conversation = await firstValueFrom(this.chatService.startConversation(candidateUserId));
      await this.router.navigate(['/chats', conversation.id]);
    } catch {
      this.chatError.set('No se pudo iniciar el chat. Inténtalo de nuevo.');
    }
  }
}

function sortByCompatibility(list: ComparisonSummary[]): CardView[] {
  return list
    .map((comparison): CardView => ({
      ...comparison,
      expanded: false,
      detail: null,
      detailLoading: false,
      detailError: false,
    }))
    .sort((a, b) => (b.result?.compatibilidad_final ?? -1) - (a.result?.compatibilidad_final ?? -1));
}
