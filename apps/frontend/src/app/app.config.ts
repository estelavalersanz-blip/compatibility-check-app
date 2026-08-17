import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
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
