import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * `POST /users/me/recalculate` (design.md decisión 5b) — usado por `features/questionnaire` (modo
 * edición, sección 14), `features/results-dashboard` (sección 16) y `features/settings` (sección
 * 17): los tres llaman al mismo endpoint en vez de duplicar lógica de recálculo.
 */
@Injectable({ providedIn: 'root' })
export class MatchingService {
  private readonly http = inject(HttpClient);

  recalculate(): Observable<unknown> {
    return this.http.post(`${environment.apiBaseUrl}/users/me/recalculate`, null);
  }
}
