import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  ComparisonQuestionDetail,
  ComparisonSummary,
  Dimension,
  DIMENSIONS,
} from '@compatibility-check-app/shared-types';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { firstValueFrom } from 'rxjs';
import { ChatService } from '../../core/chat.service';
import { ComparisonsService } from '../../core/comparisons.service';
import { MatchingService } from '../../core/matching.service';
import { UsersService } from '../../core/users.service';

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
  private readonly usersService = inject(UsersService);
  private readonly matchingService = inject(MatchingService);
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);

  readonly dimensions = DIMENSIONS;

  readonly loading = signal(true);
  readonly comparisons = signal<CardView[]>([]);
  readonly needsRecalculation = signal(false);
  readonly recalculating = signal(false);
  readonly chatError = signal<string | null>(null);

  readonly chartOptions: ChartConfiguration<'radar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { r: { min: 1, max: 10 } },
  };

  constructor() {
    // Primera carga con suscripción directa, nunca envuelta en un timer/interval (gotcha zoneless
    // ya conocido, ver core/shell/shell.component.ts). Sin sondeo aquí: a diferencia de
    // features/processing, esta pantalla no espera nada por defecto — solo se refresca tras pulsar
    // "Recalcular" (tarea 16.4).
    this.usersService.getOwnProfile().subscribe((profile) => {
      this.needsRecalculation.set(profile?.needsRecalculation ?? false);
    });
    this.fetchComparisons();
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

  /** Tarea 16.4/16.5: tras completarse el recálculo, un único refresco de
   *  `GET /users/me/comparisons` (y del propio perfil, para que el botón vuelva a deshabilitarse) —
   *  sin sondeo propio aquí, a diferencia de features/processing. */
  async recalculateNow(): Promise<void> {
    if (!this.needsRecalculation() || this.recalculating()) {
      return;
    }
    this.recalculating.set(true);
    try {
      await firstValueFrom(this.matchingService.recalculate());
      this.usersService.invalidateOwnProfile();
      const profile = await firstValueFrom(this.usersService.getOwnProfile());
      this.needsRecalculation.set(profile?.needsRecalculation ?? false);
      this.fetchComparisons();
    } finally {
      this.recalculating.set(false);
    }
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
