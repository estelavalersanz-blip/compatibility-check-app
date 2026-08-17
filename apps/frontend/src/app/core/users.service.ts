import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { OwnUserProfile } from '@compatibility-check-app/shared-types';
import { Observable, catchError, of, shareReplay, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

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
}
