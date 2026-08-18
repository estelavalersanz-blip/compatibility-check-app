import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Answer } from '@compatibility-check-app/shared-types';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * `users/me/questionnaire` (spec `personal-questionnaire`) — usado por `features/questionnaire`
 * (sección 14, modo creación y edición) y, más adelante, por el resumen de `features/settings`
 * (sección 17). El body de cada endpoint es directamente el array de respuestas, nunca envuelto en
 * un objeto — mismo criterio que `QuestionnairesController` en el backend.
 */
@Injectable({ providedIn: 'root' })
export class QuestionnaireService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/me/questionnaire`;

  /** Respuestas guardadas hasta el momento (parciales o completas) — `[]` si no hay ninguna. */
  getAnswers(): Observable<Answer[]> {
    return this.http.get<Answer[]>(this.baseUrl);
  }

  /** Borrador: 0-36 respuestas, nunca dispara el pipeline de matching/IA (decisión 5c). */
  saveDraft(answers: Answer[]): Observable<Answer[]> {
    return this.http.put<Answer[]>(`${this.baseUrl}/draft`, answers);
  }

  /** Envío final en modo creación — exige las 36 respuestas completas. */
  complete(answers: Answer[]): Observable<Answer[]> {
    return this.http.post<Answer[]>(this.baseUrl, answers);
  }

  /** Guardado en modo edición (cuestionario ya completado antes) — también exige las 36 completas. */
  update(answers: Answer[]): Observable<Answer[]> {
    return this.http.patch<Answer[]>(this.baseUrl, answers);
  }
}
