import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Quality } from '@compatibility-check-app/shared-types';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * `GET /qualities` (spec `user-registration`, "Catálogo de cualidades disponible públicamente") —
 * vive en `core/` porque lo consumen tanto `features/registration` (sección 13) como
 * `features/settings` (sección 17), mismo criterio que `ChatService`.
 */
@Injectable({ providedIn: 'root' })
export class QualitiesService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Quality[]> {
    return this.http.get<Quality[]>(`${environment.apiBaseUrl}/qualities`);
  }
}
