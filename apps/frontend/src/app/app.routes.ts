import { Routes } from '@angular/router';
import { mainRouteGuard } from './core/guards/main-route.guard';
import { profileGuard } from './core/guards/profile.guard';
import { ShellComponent } from './core/shell/shell.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { LandingComponent } from './features/landing/landing.component';
import { ProcessingComponent } from './features/processing/processing.component';
import { QuestionnaireComponent } from './features/questionnaire/questionnaire.component';
import { RegistrationComponent } from './features/registration/registration.component';
import { ResultsDashboardComponent } from './features/results-dashboard/results-dashboard.component';
import { SettingsComponent } from './features/settings/settings.component';
import { PlaceholderComponent } from './shared/placeholder/placeholder.component';

/**
 * Tabla de rutas (secciones 11/11d/12/13/14/15/16/17 de `tasks.md`). Las rutas de secciones aún no
 * implementadas (17b en adelante) usan `PlaceholderComponent` como marcador temporal — cada sección
 * futura sustituye su propio `component` por la feature real, sin tocar la estructura de
 * guards/shell de aquí.
 */
export const routes: Routes = [
  // Ruta principal: sin sesión, `mainRouteGuard` deja pasar y se muestra la landing (tarea 11d.3);
  // con sesión, el guard siempre redirige (nunca llega a renderizar `LandingComponent`).
  {
    path: '',
    pathMatch: 'full',
    component: LandingComponent,
    canActivate: [mainRouteGuard],
  },

  // Shell B — pantallas públicas de autenticación (sin navbar, sección 12).
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },
  { path: 'auth/forgot-password', component: ForgotPasswordComponent },
  { path: 'auth/reset-password', component: ResetPasswordComponent },

  // Shell A — aplicación autenticada, cabecera compartida (tarea 11.2).
  {
    path: '',
    component: ShellComponent,
    children: [
      // Completar perfil: única ruta autenticada SIN ProfileGuard (tarea 11.6) — es precisamente
      // adonde ProfileGuard redirige. `minimalNav` oculta chat/configuración en la cabecera.
      {
        path: 'registration',
        component: RegistrationComponent,
        data: { title: 'Completar perfil', minimalNav: true },
      },
      // `?mode=edit` (tarea 14.9, desde "Editar tus respuestas" de features/settings) reutiliza esta
      // misma ruta — el modo se lee del query param dentro del propio componente, no de la ruta.
      {
        path: 'questionnaire',
        component: QuestionnaireComponent,
        canActivate: [profileGuard],
        data: { title: 'Cuestionario' },
      },
      // Destino real de "Enviar cuestionario" en modo creación (tarea 14.5b). Ruta añadida en la
      // sección 14 (no en la 11, que solo scaffoldeó las 5 rutas ya conocidas entonces).
      {
        path: 'processing',
        component: ProcessingComponent,
        canActivate: [profileGuard],
        data: { title: 'Analizando tu compatibilidad' },
      },
      {
        path: 'dashboard',
        component: ResultsDashboardComponent,
        canActivate: [profileGuard],
        data: { title: 'Dashboard' },
      },
      {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [profileGuard],
        data: { title: 'Configuración' },
      },
      {
        path: 'chats',
        component: PlaceholderComponent,
        canActivate: [profileGuard],
        data: { title: 'Chats' },
      },
      // Destino real del botón "Chatear" de cada tarjeta del dashboard (tarea 16.7). Añadida ahora,
      // de forma preventiva — lección aprendida en la sección 14 (`/processing` no existía y
      // `router.navigate` lanzaba `NG04002` en el navegador, invisible para Karma porque cada spec
      // usa su propia tabla de rutas aislada) — en vez de esperar a que la sección 17b la necesite
      // de verdad y volver a redescubrir el mismo fallo.
      {
        path: 'chats/:id',
        component: PlaceholderComponent,
        canActivate: [profileGuard],
        data: { title: 'Chat' },
      },
    ],
  },
];
