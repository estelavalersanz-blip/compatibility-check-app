import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { OwnUserProfile } from '@compatibility-check-app/shared-types';
import { Observable, catchError, of, shareReplay, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

/** Payload de `POST /users/me/profile` (registro paso 2, sección 13) — los datos de ambos pasos del
 *  wizard juntos, en un único envío. */
export interface CreateProfilePayload {
  name: string;
  alias: string;
  qualityIds: string[];
  photo: File;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private ownProfile$: Observable<OwnUserProfile | null> | null = null;

  /**
   * `GET /users/me`, cacheada durante la sesión de navegación (`shareReplay(1)` sobre el propio
   * Observable, no solo sobre sus valores): el guard de la ruta principal (tarea 11.4) y
   * `ProfileGuard` (tarea 11.6) consultan exactamente lo mismo cuando una navegación encadena los
   * dos (p. ej. `/` redirige a `/questionnaire`, que vuelve a pasar por `ProfileGuard`) — sin esta
   * caché dispararían la petición dos veces (tarea 11.6, "sin duplicar la llamada por cada guard").
   * `null` significa "todavía no tiene fila de perfil" (404 real del backend), nunca se confunde con
   * un objeto vacío. `invalidateOwnProfile()` fuerza a repetir la consulta la próxima vez — lo usarán
   * las secciones 13 (alta) y 17 (edición) tras mutar el perfil.
   */
  getOwnProfile(): Observable<OwnUserProfile | null> {
    this.ownProfile$ ??= this.http.get<OwnUserProfile>(`${environment.apiBaseUrl}/users/me`).pipe(
      catchError((error: HttpErrorResponse) =>
        error.status === 404 ? of(null) : throwError(() => error),
      ),
      shareReplay(1),
    );
    return this.ownProfile$;
  }

  invalidateOwnProfile(): void {
    this.ownProfile$ = null;
  }

  /**
   * `GET /users/check-alias` — validación en vivo del campo alias (tarea 13.2, vía
   * `shared/alias-available.validator.ts`; reutilizado también por `features/settings` en la sección
   * 17). Pública en el backend: funciona con o sin sesión, aunque en esta pantalla siempre hay una
   * (registro paso 2, ya autenticado).
   */
  checkAlias(alias: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(`${environment.apiBaseUrl}/users/check-alias`, {
      params: { alias },
    });
  }

  /**
   * `POST /users/me/profile` (registro paso 2, design.md decisión 3e) — único envío del wizard de 2
   * pasos, con los datos de ambos pasos juntos. `multipart/form-data` porque incluye la foto;
   * `qualityIds` se repite un campo por cada id seleccionado (el backend, `UsersController.
   * parseProfileBody`, ya normaliza esa forma repetida a array). No se fija manualmente el header
   * `Content-Type`: el navegador debe generar el boundary del multipart él mismo.
   */
  createProfile(payload: CreateProfilePayload): Observable<OwnUserProfile> {
    const body = new FormData();
    body.set('name', payload.name);
    body.set('alias', payload.alias);
    payload.qualityIds.forEach((id) => body.append('qualityIds', id));
    body.set('photo', payload.photo, payload.photo.name);
    return this.http.post<OwnUserProfile>(`${environment.apiBaseUrl}/users/me/profile`, body);
  }
}
