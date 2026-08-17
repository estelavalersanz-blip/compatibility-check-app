import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ComparisonSummary } from '@compatibility-check-app/shared-types';
import { catchError, interval, of } from 'rxjs';
import { ComparisonsService } from '../../core/comparisons.service';

/** Sondeo de `GET /users/me/comparisons` mientras se resuelven las comparaciones (design.md decisión
 *  3f). Más corto que el sondeo de no leídos de `core/shell` (20-30s): aquí hay una persona mirando
 *  un spinner esperando un resultado, no un contador de fondo. */
const POLL_INTERVAL_MS = 3000;

/**
 * Pantalla de procesamiento (sección 15; design.md decisión 3f): spinner + una fila por cada
 * candidato ya seleccionado con su icono de estado — nunca un porcentaje agregado ni un contador
 * "N de 3", porque el orden de finalización entre comparaciones no es predecible. El polling se
 * detiene en cuanto todas las comparaciones existentes están en `completed`/`error` (navegando al
 * dashboard) — o, simplemente, al salir de la pantalla, vía `takeUntilDestroyed`.
 */
@Component({
  selector: 'app-processing',
  standalone: true,
  templateUrl: './processing.component.html',
  styleUrl: './processing.component.scss',
})
export class ProcessingComponent {
  private readonly comparisonsService = inject(ComparisonsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly comparisons = signal<ComparisonSummary[]>([]);

  constructor() {
    // Primera carga con suscripción directa, nunca envuelta en un timer/interval (gotcha zoneless ya
    // conocido, ver core/shell/shell.component.ts) — el sondeo periódico va aparte.
    this.poll();
    interval(POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.poll());
  }

  private poll(): void {
    this.comparisonsService
      .findMine()
      .pipe(catchError(() => of<ComparisonSummary[]>([])))
      .subscribe((list) => this.applyComparisons(list));
  }

  private applyComparisons(list: ComparisonSummary[]): void {
    this.comparisons.set(list);
    // `[].every(...)` es vacuamente `true` — el guard de `length` evita navegar antes de que existan
    // filas todavía (el matching, disparado por evento, puede tardar un instante más que esta
    // primera consulta en crearlas).
    const allResolved =
      list.length > 0 && list.every((comparison) => comparison.status === 'completed' || comparison.status === 'error');
    if (allResolved) {
      void this.router.navigate(['/dashboard']);
    }
  }
}
