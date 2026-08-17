import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Adjunta el JWT de Supabase como `Authorization: Bearer <token>` a toda petición dirigida al
 * backend (`environment.apiBaseUrl`) — nunca a otras peticiones. Las llamadas de `@supabase/
 * supabase-js` (signIn/signUp/signOut) no pasan por `HttpClient`, así que este interceptor nunca las
 * ve ni interfiere con ellas.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const token = inject(AuthService).getAccessToken();
  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
