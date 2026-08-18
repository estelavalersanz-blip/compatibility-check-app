import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ComparisonQuestionDetail, ComparisonSummary } from '@compatibility-check-app/shared-types';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * `GET /users/me/comparisons` (usado por `features/processing`, sección 15, y
 * `features/results-dashboard`, sección 16) y `GET /comparisons/:id/detail` (solo sección 16, el
 * detalle expandible por pregunta — ya filtrado de respuestas por el propio backend).
 */
@Injectable({ providedIn: 'root' })
export class ComparisonsService {
  private readonly http = inject(HttpClient);

  findMine(): Observable<ComparisonSummary[]> {
    return this.http.get<ComparisonSummary[]>(`${environment.apiBaseUrl}/users/me/comparisons`);
  }

  findDetail(comparisonId: string): Observable<ComparisonQuestionDetail[]> {
    return this.http.get<ComparisonQuestionDetail[]>(
      `${environment.apiBaseUrl}/comparisons/${comparisonId}/detail`,
    );
  }
}
