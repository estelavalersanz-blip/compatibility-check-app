import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ComparisonSummary } from '@compatibility-check-app/shared-types';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * `GET /users/me/comparisons` — usado por `features/processing` (sección 15, sondeo mientras se
 * resuelven las comparaciones) y, más adelante, por `features/results-dashboard` (sección 16).
 */
@Injectable({ providedIn: 'root' })
export class ComparisonsService {
  private readonly http = inject(HttpClient);

  findMine(): Observable<ComparisonSummary[]> {
    return this.http.get<ComparisonSummary[]>(`${environment.apiBaseUrl}/users/me/comparisons`);
  }
}
