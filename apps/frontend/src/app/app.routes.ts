import { Routes } from '@angular/router';
import { mainRouteGuard } from './core/guards/main-route.guard';
import { profileGuard } from './core/guards/profile.guard';
import { ShellComponent } from './core/shell/shell.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { LandingComponent } from './features/landing/landing.component';
import { QuestionnaireComponent } from './features/questionnaire/questionnaire.component';
import { RegistrationComponent } from './features/registration/registration.component';
import { PlaceholderComponent } from './shared/placeholder/placeholder.component';

/**
 * Tabla de rutas (secciones 11/11d/12/13/14 de `tasks.md`). Las rutas de secciones aún no
 * implementadas (15 en adelante) usan `PlaceholderComponent` como marcador temporal — cada sección
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
      // `features/processing` (sección 15, aún sin implementar) — destino real de "Enviar
      // cuestionario" en modo creación (tarea 14.5b). Ruta añadida ahora, no en la sección 11: aquella
      // solo scaffoldeó las 5 rutas ya conocidas entonces (registration/questionnaire/dashboard/
      // settings/chats); esta es la primera vez que algo navega de verdad a "/processing", y sin la
      // ruta, `router.navigate(['/processing'])` lanza `NG04002` (ruta inexistente) — descubierto en
      // la verificación en el navegador de esta misma sección, no antes.
      {
        path: 'processing',
        component: PlaceholderComponent,
        canActivate: [profileGuard],
        data: { title: 'Analizando tu compatibilidad' },
      },
      {
        path: 'dashboard',
        component: PlaceholderComponent,
        canActivate: [profileGuard],
        data: { title: 'Dashboard' },
      },
      {
        path: 'settings',
        component: PlaceholderComponent,
        canActivate: [profileGuard],
        data: { title: 'Configuración' },
      },
      {
        path: 'chats',
        component: PlaceholderComponent,
        canActivate: [profileGuard],
        data: { title: 'Chats' },
      },
    ],
  },
];
