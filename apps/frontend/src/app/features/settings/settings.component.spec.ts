import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';
import { Component, LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { OwnUserProfile, Quality } from '@compatibility-check-app/shared-types';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { MatchingService } from '../../core/matching.service';
import { QualitiesService } from '../../core/qualities.service';
import { UpdateProfilePayload, UsersService } from '../../core/users.service';
import { expectNoHorizontalOverflow } from '../../core/testing/no-horizontal-overflow';
import { SettingsComponent } from './settings.component';

// Solo `app.config.ts` (nunca cargado por `TestBed`) registra el locale español — sin esto, el pipe
// `date` de esta pantalla formatearía en inglés en los tests aunque no lo comprueben explícitamente.
registerLocaleData(localeEs);

// Selector/plantilla propios (mismo criterio que `registration.component.spec.ts`): dos componentes
// anónimos con selector y plantilla idénticos generan el mismo id interno de Angular (NG0912) al
// compartir el mismo bundle de test de Karma.
@Component({ selector: 'app-settings-test-blank', standalone: true, template: '' })
class BlankComponent {}

const QUALITIES: Quality[] = Array.from({ length: 15 }, (_, index) => ({
  id: `q${index + 1}`,
  name: `Cualidad ${index + 1}`,
}));

const INITIAL_QUALITY_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'];

function ownProfile(overrides: Partial<OwnUserProfile> = {}): OwnUserProfile {
  return {
    id: 'user-1',
    name: 'Ada Lovelace',
    alias: 'ada',
    photoUrl: 'https://example.com/ada.jpg',
    questionnaireCompletedAt: '2024-03-15T00:00:00.000Z',
    needsRecalculation: false,
    qualityIds: INITIAL_QUALITY_IDS,
    ...overrides,
  };
}

function setInputValue(fixture: ComponentFixture<SettingsComponent>, id: string, value: string): void {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`);
  if (!input) {
    throw new Error(`No se encontró el input #${id}`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function findButton(root: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((candidate) =>
    candidate.textContent?.trim().includes(text),
  );
  if (!button) {
    throw new Error(`No se encontró el botón "${text}"`);
  }
  return button;
}

function pills(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('.quality-pill'));
}

interface AuthServiceSpies {
  session: jasmine.Spy;
  signInWithPassword: jasmine.Spy;
  updatePassword: jasmine.Spy;
}

function fakeAuthServiceForSettings(email = 'ada@example.com'): AuthServiceSpies {
  return {
    session: jasmine.createSpy('session').and.returnValue({ user: { email } }),
    signInWithPassword: jasmine.createSpy('signInWithPassword').and.resolveTo(undefined),
    updatePassword: jasmine.createSpy('updatePassword').and.resolveTo(undefined),
  };
}

function setup(
  options: {
    profile?: OwnUserProfile;
    updateProfile?: jasmine.Spy;
    recalculate?: jasmine.Spy;
    auth?: AuthServiceSpies;
    aliasAvailable?: boolean;
  } = {},
) {
  const getOwnProfileSpy = jasmine.createSpy('getOwnProfile').and.returnValue(of(options.profile ?? ownProfile()));
  const invalidateOwnProfileSpy = jasmine.createSpy('invalidateOwnProfile');
  const updateProfileSpy =
    options.updateProfile ?? jasmine.createSpy('updateProfile').and.returnValue(of(ownProfile()));
  const recalculateSpy = options.recalculate ?? jasmine.createSpy('recalculate').and.returnValue(of({}));
  const auth = options.auth ?? fakeAuthServiceForSettings();
  const checkAliasSpy = jasmine
    .createSpy('checkAlias')
    .and.callFake(() => of({ available: options.aliasAvailable ?? true }));

  TestBed.configureTestingModule({
    imports: [SettingsComponent],
    providers: [
      provideRouter([{ path: 'questionnaire', component: BlankComponent }, { path: 'dashboard', component: BlankComponent }]),
      { provide: LOCALE_ID, useValue: 'es-ES' },
      {
        provide: UsersService,
        useValue: {
          getOwnProfile: getOwnProfileSpy,
          invalidateOwnProfile: invalidateOwnProfileSpy,
          checkAlias: checkAliasSpy,
          updateProfile: updateProfileSpy,
        },
      },
      { provide: QualitiesService, useValue: { getAll: () => of(QUALITIES) } },
      { provide: MatchingService, useValue: { recalculate: recalculateSpy } },
      { provide: AuthService, useValue: auth },
    ],
  });

  const fixture = TestBed.createComponent(SettingsComponent);
  fixture.detectChanges();
  return { fixture, updateProfileSpy, recalculateSpy, invalidateOwnProfileSpy, checkAliasSpy, auth };
}

async function loaded(fixture: ComponentFixture<SettingsComponent>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('SettingsComponent — perfil (tarea 17.1)', () => {
  it('prerellena nombre, alias y las 5 cualidades actuales', async () => {
    const { fixture } = setup();
    await loaded(fixture);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector<HTMLInputElement>('#settings-name')?.value).toBe('Ada Lovelace');
    expect(root.querySelector<HTMLInputElement>('#settings-alias')?.value).toBe('ada');
    const selected = pills(root).filter((pill) => pill.classList.contains('quality-pill--selected'));
    expect(selected.length).toBe(5);
  });

  it('prerellena también la foto de perfil desde profile.photoUrl', async () => {
    const { fixture } = setup({
      profile: ownProfile({ photoUrl: 'https://example.com/una-foto-real.jpg' }),
    });
    await loaded(fixture);
    const root = fixture.nativeElement as HTMLElement;

    // Único <img> de toda la plantilla (vista previa dentro de `.profile-photo-picker`) — sin
    // ambigüedad posible con `querySelector('img')` a secas.
    expect(root.querySelector('img')?.getAttribute('src')).toBe('https://example.com/una-foto-real.jpg');
  });

  /**
   * Bug real reportado por la usuaria con captura (2026-08-19): al volver a entrar en Configuración
   * tras haber subido una foto, salía pequeña y descentrada dentro del círculo en vez de rellenarlo
   * — faltaba `object-fit: cover` en el `<img>` (sin él, una foto que no sea ya perfectamente
   * cuadrada se renderiza a su proporción intrínseca en vez de recortada al cuadrado del círculo).
   * Se comprueba el estilo COMPUTADO, no solo la presencia de una clase — así el test falla de
   * verdad si algún día se borra la regla de `settings.component.scss` sin querer, igual que hace
   * `expectNoHorizontalOverflow` para la geometría real (`core/testing/no-horizontal-overflow.ts`).
   */
  it('la foto de perfil se recorta con object-fit: cover (bug real: salía pequeña y descentrada)', async () => {
    const { fixture } = setup({
      profile: ownProfile({ photoUrl: 'https://example.com/una-foto-real.jpg' }),
    });
    await loaded(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const img = root.querySelector('img');
    if (!img) {
      throw new Error('No se encontró la foto de perfil');
    }

    expect(getComputedStyle(img).objectFit).toBe('cover');
  });

  it('al llegar a 5 marcadas, las no marcadas quedan deshabilitadas (misma regla que el registro)', async () => {
    const { fixture } = setup();
    await loaded(fixture);
    const root = fixture.nativeElement as HTMLElement;

    // Ya hay 5 marcadas al cargar (qualityIds del perfil) — la 6ª (no marcada) debe estar deshabilitada.
    const unselected = pills(root).find((pill) => !pill.classList.contains('quality-pill--selected'));
    expect(unselected?.disabled).toBe(true);
  });

  it('bloquea el guardado si la selección de cualidades deja de ser exactamente 5', async () => {
    const { fixture } = setup();
    await loaded(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const saveButton = findButton(root, 'Guardar cambios');
    expect(saveButton.disabled).toBe(false); // 5 seleccionadas al cargar

    pills(root)
      .find((pill) => pill.classList.contains('quality-pill--selected'))!
      .click();
    fixture.detectChanges();

    expect(findButton(root, 'Guardar cambios').disabled).toBe(true); // ahora hay 4
  });

  it('valida el alias en vivo contra GET /users/check-alias, igual que el registro', async () => {
    const { fixture, checkAliasSpy } = setup({ aliasAvailable: false });
    await loaded(fixture);

    setInputValue(fixture, 'settings-alias', 'ocupado');
    await loaded(fixture);

    expect(checkAliasSpy).toHaveBeenCalledWith('ocupado');
    const root = fixture.nativeElement as HTMLElement;
    const aliasInput = root.querySelector('#settings-alias');
    const aliasGroup = aliasInput?.parentElement ?? null;
    expect(aliasInput?.classList.contains('is-invalid')).toBe(true);
    expect(aliasGroup?.querySelector('.invalid-feedback')?.textContent).toContain('ya está en uso');
    expect(findButton(root, 'Guardar cambios').disabled).toBe(true);
  });

  it('al guardar, envía UpdateProfilePayload con los datos actuales del formulario', async () => {
    const updateProfileSpy = jasmine.createSpy('updateProfile').and.returnValue(of(ownProfile()));
    const { fixture } = setup({ updateProfile: updateProfileSpy });
    await loaded(fixture);

    setInputValue(fixture, 'settings-name', 'Ada L.');
    await loaded(fixture);
    findButton(fixture.nativeElement as HTMLElement, 'Guardar cambios').click();
    await loaded(fixture);

    expect(updateProfileSpy).toHaveBeenCalledTimes(1);
    const payload = updateProfileSpy.calls.mostRecent().args[0] as UpdateProfilePayload;
    expect(payload.name).toBe('Ada L.');
    expect(payload.alias).toBe('ada');
    expect(payload.qualityIds.length).toBe(5);
    expect(payload.photo).toBeUndefined(); // no se tocó la foto
  });

  /**
   * Ruta de error 409 (alias duplicado) al GUARDAR — a diferencia del test de arriba, que cubre la
   * validación en vivo del campo contra GET /users/check-alias, este es el error que puede devolver
   * el propio PATCH si dos guardados compiten por el mismo alias entre que se valida en vivo y se
   * pulsa "Guardar cambios". `saveProfile()` (`settings.component.ts`) distingue este caso de un
   * error genérico para mostrar un mensaje específico, y — a diferencia de un guardado con éxito —
   * nunca debe limpiar lo que el usuario ya había escrito.
   */
  it('si el guardado devuelve 409 (alias duplicado), muestra el error y no limpia el formulario', async () => {
    const updateProfileSpy = jasmine
      .createSpy('updateProfile')
      .and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const { fixture } = setup({ updateProfile: updateProfileSpy });
    await loaded(fixture);
    const root = fixture.nativeElement as HTMLElement;

    setInputValue(fixture, 'settings-name', 'Ada L.');
    await loaded(fixture);
    findButton(root, 'Guardar cambios').click();
    await loaded(fixture);

    expect(root.querySelector('.alert-danger')?.textContent).toContain('ya está en uso');
    // No se limpia: el nombre recién editado sigue en el formulario tras el error.
    expect(root.querySelector<HTMLInputElement>('#settings-name')?.value).toBe('Ada L.');
  });
});

describe('SettingsComponent — aviso de recalcular (tarea 17.1b)', () => {
  it('si cambia la selección de cualidades y la respuesta indica needsRecalculation, muestra el aviso', async () => {
    const newQualityIds = ['q1', 'q2', 'q3', 'q4', 'q6']; // q5 -> q6
    const updateProfileSpy = jasmine
      .createSpy('updateProfile')
      .and.returnValue(of(ownProfile({ qualityIds: newQualityIds, needsRecalculation: true })));
    const { fixture } = setup({ updateProfile: updateProfileSpy });
    await loaded(fixture);
    const root = fixture.nativeElement as HTMLElement;

    // Cambia una cualidad: desmarca q5 (5ª píldora ya marcada) y marca q6 (6ª píldora, la primera libre).
    pills(root)[4].click();
    fixture.detectChanges();
    pills(root)[5].click();
    fixture.detectChanges();

    findButton(root, 'Guardar cambios').click();
    await loaded(fixture);

    expect(root.textContent).toContain('recalcular');
    expect(findButton(root, 'Recalcular compatibilidad ahora')).not.toBeNull();
  });

  it('si NO cambió la selección de cualidades, no aparece ningún aviso aunque needsRecalculation ya fuera true', async () => {
    // Caso límite real (ver notas de la tarea 17.1b en tasks.md): `PATCH /users/me` en el backend solo
    // ESCRIBE `needs_recalculation = true` cuando las cualidades cambian, pero nunca lo resetea a
    // `false` cuando no cambian — así que la respuesta puede traer `needsRecalculation: true` "heredado"
    // de un recálculo pendiente anterior (p. ej. tras editar el cuestionario) sin relación con este
    // guardado. El aviso de esta pantalla debe basarse en si la propia acción de guardar cambió la
    // selección, no solo en el valor crudo de la respuesta.
    const updateProfileSpy = jasmine
      .createSpy('updateProfile')
      .and.returnValue(of(ownProfile({ needsRecalculation: true })));
    const { fixture } = setup({ updateProfile: updateProfileSpy });
    await loaded(fixture);
    const root = fixture.nativeElement as HTMLElement;

    setInputValue(fixture, 'settings-name', 'Ada L.'); // solo cambia el nombre, no las cualidades
    await loaded(fixture);
    findButton(root, 'Guardar cambios').click();
    await loaded(fixture);

    expect(root.querySelector('.alert-warning')).toBeNull();
  });

  it('"Recalcular compatibilidad ahora" llama a POST /users/me/recalculate y navega al dashboard', async () => {
    const newQualityIds = ['q1', 'q2', 'q3', 'q4', 'q6'];
    const updateProfileSpy = jasmine
      .createSpy('updateProfile')
      .and.returnValue(of(ownProfile({ qualityIds: newQualityIds, needsRecalculation: true })));
    const recalculateSpy = jasmine.createSpy('recalculate').and.returnValue(of({}));
    const { fixture } = setup({ updateProfile: updateProfileSpy, recalculate: recalculateSpy });
    await loaded(fixture);
    const root = fixture.nativeElement as HTMLElement;

    pills(root)[4].click();
    fixture.detectChanges();
    pills(root)[5].click();
    fixture.detectChanges();
    findButton(root, 'Guardar cambios').click();
    await loaded(fixture);

    findButton(root, 'Recalcular compatibilidad ahora').click();
    await loaded(fixture);

    expect(recalculateSpy).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });
});

describe('SettingsComponent — cambio de contraseña (tarea 17.3)', () => {
  function passwordForm(fixture: ComponentFixture<SettingsComponent>): void {
    setInputValue(fixture, 'current-password', 'actualCorrecta1');
    setInputValue(fixture, 'new-password', 'nuevaContrasena1');
    setInputValue(fixture, 'new-password-confirm', 'nuevaContrasena1');
  }

  it('reintenta signInWithPassword con la contraseña actual antes de llamar a updateUser', async () => {
    const auth = fakeAuthServiceForSettings();
    const { fixture } = setup({ auth });
    await loaded(fixture);
    passwordForm(fixture);
    await loaded(fixture);

    findButton(fixture.nativeElement as HTMLElement, 'Cambiar contraseña').click();
    await loaded(fixture);

    expect(auth.signInWithPassword).toHaveBeenCalledWith('ada@example.com', 'actualCorrecta1');
    expect(auth.updatePassword).toHaveBeenCalledWith('nuevaContrasena1');
  });

  it('si la contraseña actual es incorrecta, no llama a updateUser y no cambia la contraseña', async () => {
    const auth = fakeAuthServiceForSettings();
    auth.signInWithPassword.and.rejectWith(new Error('invalid credentials'));
    const { fixture } = setup({ auth });
    await loaded(fixture);
    passwordForm(fixture);
    await loaded(fixture);

    findButton(fixture.nativeElement as HTMLElement, 'Cambiar contraseña').click();
    await loaded(fixture);

    expect(auth.updatePassword).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('no es correcta');
  });
});

describe('SettingsComponent — resumen del cuestionario (tarea 17.5)', () => {
  it('muestra la fecha de finalización y un botón que navega a /questionnaire?mode=edit', async () => {
    const { fixture } = setup({ profile: ownProfile({ questionnaireCompletedAt: '2024-03-15T00:00:00.000Z' }) });
    await loaded(fixture);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('15');
    expect(root.textContent).toContain('2024');

    findButton(root, 'Editar tus respuestas').click();
    await loaded(fixture);

    expect(TestBed.inject(Router).url).toBe('/questionnaire?mode=edit');
  });

  it('aparece antes que "Cambiar contraseña" (feedback explícito de la usuaria)', async () => {
    const { fixture } = setup();
    await loaded(fixture);
    const root = fixture.nativeElement as HTMLElement;

    // La primera `card-header` ("Configuración") es la del propio `ModalPanelComponent` (tarea del
    // modal de Chats/Configuración) — las 3 siguientes son las de siempre, sin reordenar entre sí.
    const headers = Array.from(root.querySelectorAll('.card-header')).map((el) => el.textContent?.trim());

    expect(headers).toEqual(['Configuración', 'Tu perfil', 'Tu cuestionario', 'Cambiar contraseña']);
  });
});

describe('SettingsComponent — responsive (tarea 21.3)', () => {
  it('el formulario de configuración no genera scroll horizontal en viewport móvil (~375px)', async () => {
    const { fixture } = setup();
    await loaded(fixture);

    await expectNoHorizontalOverflow(fixture.nativeElement as HTMLElement, 375);
  });
});
