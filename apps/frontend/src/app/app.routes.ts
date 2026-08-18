import { Routes } from '@angular/router';
import { mainRouteGuard } from './core/guards/main-route.guard';
import { profileGuard } from './core/guards/profile.guard';
import { questionnaireCompletedGuard } from './core/guards/questionnaire-completed.guard';
import { ShellComponent } from './core/shell/shell.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { ChatConversationComponent } from './features/chats/chat-conversation.component';
import { ChatsComponent } from './features/chats/chats.component';
import { LandingComponent } from './features/landing/landing.component';
import { ProcessingComponent } from './features/processing/processing.component';
import { QuestionnaireComponent } from './features/questionnaire/questionnaire.component';
import { RegistrationComponent } from './features/registration/registration.component';
import { ResultsDashboardComponent } from './features/results-dashboard/results-dashboard.component';
import { SettingsComponent } from './features/settings/settings.component';

/**
 * Tabla de rutas (secciones 11/11d/12/13/14/15/16/17/17b de `tasks.md`) — con esta sección, todas
 * las pantallas de frontend ya son componentes reales (`PlaceholderComponent` deja de usarse aquí;
 * las secciones 18 en adelante son seed/despliegue/verificación, sin pantallas nuevas).
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
      // `settings`/`chats`/`chats/:id` (a diferencia de `questionnaire`/`dashboard`) exigen además
      // haber completado el cuestionario una primera vez (`questionnaireCompletedGuard`) — sin esto,
      // la cabecera ya permitía entrar aquí desde `/questionnaire` sin haberlo completado
      // (`minimalNav` solo oculta esos botones en `/registration`), dejando ambas pantallas en un
      // estado sin sentido: "Editar tus respuestas" apuntaría a un cuestionario que aún no existe, y
      // el chat nunca puede tener conversaciones sin `comparisons` todavía.
      {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [profileGuard, questionnaireCompletedGuard],
        data: { title: 'Configuración' },
      },
      {
        path: 'chats',
        component: ChatsComponent,
        canActivate: [profileGuard, questionnaireCompletedGuard],
        data: { title: 'Chats' },
      },
      // Destino real del botón "Chatear" de cada tarjeta del dashboard (tarea 16.7) y de cada fila
      // de `features/chats`. La ruta ya existía como placeholder desde la sección 16 (lección de la
      // 14 aplicada preventivamente); esta sección solo sustituye el componente.
      {
        path: 'chats/:id',
        component: ChatConversationComponent,
        canActivate: [profileGuard, questionnaireCompletedGuard],
        data: { title: 'Chat' },
      },
    ],
  },
];
