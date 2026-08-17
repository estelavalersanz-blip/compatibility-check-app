import { Routes } from '@angular/router';
import { mainRouteGuard } from './core/guards/main-route.guard';
import { profileGuard } from './core/guards/profile.guard';
import { ShellComponent } from './core/shell/shell.component';
import { LandingComponent } from './features/landing/landing.component';
import { PlaceholderComponent } from './shared/placeholder/placeholder.component';

/**
 * Tabla de rutas (secciones 11/11d de `tasks.md`). Las rutas de secciones aún no implementadas (12 en
 * adelante) usan `PlaceholderComponent` como marcador temporal — cada sección futura sustituye su
 * propio `component` por la feature real, sin tocar la estructura de guards/shell de aquí.
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

  // Shell B — pantallas públicas de autenticación (sin navbar). Solo se registra `/auth/login` por
  // ahora: es la única que necesita esta sección (destino de "cerrar sesión" y del guard sin
  // sesión); el resto (`register`, `forgot-password`, `reset-password`) los añade la sección 12.
  {
    path: 'auth/login',
    component: PlaceholderComponent,
    data: { title: 'Iniciar sesión' },
  },

  // Shell A — aplicación autenticada, cabecera compartida (tarea 11.2).
  {
    path: '',
    component: ShellComponent,
    children: [
      // Completar perfil: única ruta autenticada SIN ProfileGuard (tarea 11.6) — es precisamente
      // adonde ProfileGuard redirige. `minimalNav` oculta chat/configuración en la cabecera.
      {
        path: 'registration',
        component: PlaceholderComponent,
        data: { title: 'Completar perfil', minimalNav: true },
      },
      {
        path: 'questionnaire',
        component: PlaceholderComponent,
        canActivate: [profileGuard],
        data: { title: 'Cuestionario' },
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
