import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';

// `features/settings` (sección 17) es el primer sitio de toda la app que usa el pipe `date` — sin
// esto, formatea en inglés ("August 17, 2026") aunque el resto de la interfaz esté en español.
registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-ES' },
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Hidrata AuthService.session ANTES de que el router resuelva la primera navegación — sin esto,
    // core/shell podría parpadear sin sesión un instante incluso con una sesión ya persistida.
    provideAppInitializer(() => inject(AuthService).initialize()),
    // Radar chart de features/results-dashboard (sección 16) — registra todos los controladores por
    // defecto de Chart.js (escalas, elementos, plugins) en vez de registrar solo 'radar' a mano.
    provideCharts(withDefaultRegisterables()),
  ],
};
