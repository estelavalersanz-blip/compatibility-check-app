import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Quality } from '@compatibility-check-app/shared-types';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthService } from '../../core/auth.service';
import { ChatService } from '../../core/chat.service';
import { QualitiesService } from '../../core/qualities.service';
import { CreateProfilePayload, UsersService } from '../../core/users.service';
import { fakeAuthService, fakeChatService } from '../../core/testing/fakes';
import { expectNoHorizontalOverflow } from '../../core/testing/no-horizontal-overflow';
import { RegistrationComponent } from './registration.component';

// Selector/plantilla propios (no el `BlankComponent` por defecto de otros specs, p. ej.
// `register.component.spec.ts`): dos componentes anónimos con selector y plantilla idénticos generan
// el mismo id interno de Angular (NG0912) al compartir el mismo bundle de test de Karma.
@Component({ selector: 'app-registration-test-blank', standalone: true, template: '' })
class BlankComponent {}

const QUALITIES: Quality[] = Array.from({ length: 15 }, (_, index) => ({
  id: `q${index + 1}`,
  name: `Cualidad ${index + 1}`,
}));

function setInputValue(fixture: ComponentFixture<RegistrationComponent>, id: string, value: string): void {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`);
  if (!input) {
    throw new Error(`No se encontró el input #${id}`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function selectPhoto(
  fixture: ComponentFixture<RegistrationComponent>,
  file: File = new File(['x'], 'foto.jpg', { type: 'image/jpeg' }),
): void {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error('No se encontró el input de archivo');
  }
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
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

async function fillValidStep1(fixture: ComponentFixture<RegistrationComponent>): Promise<void> {
  setInputValue(fixture, 'name', 'Ada Lovelace');
  setInputValue(fixture, 'alias', 'ada');
  selectPhoto(fixture);
  await fixture.whenStable();
  fixture.detectChanges();
}

function goToStep2(fixture: ComponentFixture<RegistrationComponent>): void {
  findButton(fixture.nativeElement as HTMLElement, 'Siguiente').click();
  fixture.detectChanges();
}

function selectQualities(fixture: ComponentFixture<RegistrationComponent>, count: number): void {
  const root = fixture.nativeElement as HTMLElement;
  for (let i = 0; i < count; i++) {
    pills(root)[i].click();
    fixture.detectChanges();
  }
}

function setup(options: {
  aliasAvailable?: boolean;
  createProfile?: jasmine.Spy;
  qualities?: Quality[];
} = {}) {
  const checkAliasSpy = jasmine
    .createSpy('checkAlias')
    .and.callFake(() => of({ available: options.aliasAvailable ?? true }));
  const createProfileSpy =
    options.createProfile ??
    jasmine.createSpy('createProfile').and.returnValue(
      of({
        id: 'user-1',
        name: 'Ada Lovelace',
        alias: 'ada',
        photoUrl: 'https://example.com/photo.jpg',
        questionnaireCompletedAt: null,
        needsRecalculation: false,
        qualityIds: [],
      }),
    );
  const invalidateOwnProfileSpy = jasmine.createSpy('invalidateOwnProfile');

  TestBed.configureTestingModule({
    imports: [RegistrationComponent],
    providers: [
      provideRouter([{ path: '', component: BlankComponent }]),
      {
        provide: UsersService,
        useValue: {
          checkAlias: checkAliasSpy,
          createProfile: createProfileSpy,
          invalidateOwnProfile: invalidateOwnProfileSpy,
        },
      },
      { provide: QualitiesService, useValue: { getAll: () => of(options.qualities ?? QUALITIES) } },
    ],
  });

  const fixture = TestBed.createComponent(RegistrationComponent);
  fixture.detectChanges();
  return { fixture, checkAliasSpy, createProfileSpy, invalidateOwnProfileSpy };
}

describe('RegistrationComponent (tarea 13.0)', () => {
  it('se presenta en 2 pasos con paginación por puntos, el paso 1 (foto+nombre+alias) activo al empezar', () => {
    const { fixture } = setup();
    const root = fixture.nativeElement as HTMLElement;

    const dots = root.querySelectorAll('.registration-dot');
    expect(dots.length).toBe(2);
    expect(dots[0].classList.contains('registration-dot--active')).toBe(true);
    expect(dots[1].classList.contains('registration-dot--active')).toBe(false);

    expect(root.querySelector('#name')).not.toBeNull();
    expect(root.querySelector('#alias')).not.toBeNull();
    expect(root.querySelector('input[type="file"]')).not.toBeNull();
    expect(root.querySelectorAll('.quality-pill').length).toBe(0); // paso 2 aún no montado
  });

  /**
   * Mismo bug real reportado por la usuaria (captura, 2026-08-19) que en `features/settings` — mismo
   * marcado `.profile-photo-picker`, ver comentario de cabecera de `registration.component.scss`.
   * Estilo COMPUTADO, no solo presencia de clase, mismo criterio que la prueba análoga de
   * `settings.component.spec.ts`.
   */
  it('la foto de perfil se recorta con object-fit: cover (bug real: salía pequeña y descentrada)', async () => {
    const { fixture } = setup();
    selectPhoto(fixture);
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const img = root.querySelector('img');
    if (!img) {
      throw new Error('No se encontró la vista previa de la foto de perfil');
    }

    expect(getComputedStyle(img).objectFit).toBe('cover');
  });

  it('"Siguiente" permanece deshabilitado mientras foto/nombre/alias no sean válidos', async () => {
    const { fixture } = setup();
    const root = fixture.nativeElement as HTMLElement;
    const nextButton = findButton(root, 'Siguiente');
    expect(nextButton.disabled).toBe(true);

    setInputValue(fixture, 'name', 'Ada Lovelace');
    setInputValue(fixture, 'alias', 'ada');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(nextButton.disabled).toBe(true); // válido, pero sin foto todavía

    selectPhoto(fixture);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(nextButton.disabled).toBe(false);
  });

  it('marca nombre y alias como obligatorios (asterisco visible + atributo required)', () => {
    // Encontrado en verificación manual: el botón "Siguiente" se queda deshabilitado sin ninguna
    // pista de por qué — confuso para quien no sepa que ambos campos son obligatorios.
    const { fixture } = setup();
    const root = fixture.nativeElement as HTMLElement;

    const nameLabel = root.querySelector('label[for="name"]');
    const aliasLabel = root.querySelector('label[for="alias"]');
    expect(nameLabel?.textContent).toContain('*');
    expect(aliasLabel?.textContent).toContain('*');

    expect(root.querySelector<HTMLInputElement>('#name')?.required).toBe(true);
    expect(root.querySelector<HTMLInputElement>('#alias')?.required).toBe(true);
  });

  it('"Siguiente" solo avanza de paso: no llama a createProfile ni crea/modifica ningún perfil', async () => {
    const { fixture, createProfileSpy } = setup();
    await fillValidStep1(fixture);

    goToStep2(fixture);

    expect(createProfileSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h2')?.textContent).toContain('cualidades');
    const dots = root.querySelectorAll('.registration-dot');
    expect(dots[1].classList.contains('registration-dot--active')).toBe(true);
  });

  it('el envío real ocurre solo al pulsar "Finalizar" en el paso 2, con los datos de ambos pasos juntos', async () => {
    const { fixture, createProfileSpy } = setup();
    await fillValidStep1(fixture);
    goToStep2(fixture);
    selectQualities(fixture, 5);

    findButton(fixture.nativeElement as HTMLElement, 'Finalizar').click();
    await fixture.whenStable();

    expect(createProfileSpy).toHaveBeenCalledTimes(1);
    const payload = createProfileSpy.calls.mostRecent().args[0] as CreateProfilePayload;
    expect(payload.name).toBe('Ada Lovelace');
    expect(payload.alias).toBe('ada');
    expect(payload.qualityIds.length).toBe(5);
    expect(payload.photo).toBeInstanceOf(File);
  });
});

describe('RegistrationComponent — píldoras de cualidades (tarea 13.1)', () => {
  async function setupAtStep2() {
    const result = setup();
    await fillValidStep1(result.fixture);
    goToStep2(result.fixture);
    return result;
  }

  it('las 15 cualidades se muestran como píldoras (no cards)', async () => {
    const { fixture } = await setupAtStep2();
    const root = fixture.nativeElement as HTMLElement;
    expect(pills(root).length).toBe(15);
    expect(root.querySelector('.card')).not.toBeNull(); // sigue en el patrón container+card general,
    expect(root.querySelectorAll('.quality-pill.card').length).toBe(0); // pero las píldoras no son cards
  });

  it('al llegar a 5 marcadas, las no marcadas quedan deshabilitadas hasta desmarcar alguna', async () => {
    const { fixture } = await setupAtStep2();
    const root = fixture.nativeElement as HTMLElement;

    selectQualities(fixture, 5);

    expect(pills(root)[5].disabled).toBe(true); // sexta: no se puede marcar
    expect(pills(root)[0].disabled).toBe(false); // desmarcar sigue siendo posible

    pills(root)[0].click(); // desmarca una de las 5
    fixture.detectChanges();

    expect(pills(root)[5].disabled).toBe(false);
  });

  it('"Finalizar" permanece deshabilitado mientras la selección no sea exactamente 5', async () => {
    const { fixture } = await setupAtStep2();
    const root = fixture.nativeElement as HTMLElement;
    const finishButton = findButton(root, 'Finalizar');
    expect(finishButton.disabled).toBe(true);

    selectQualities(fixture, 4);
    expect(finishButton.disabled).toBe(true);

    pills(root)[4].click(); // 5ª cualidad distinta de las 4 ya marcadas
    fixture.detectChanges();
    expect(finishButton.disabled).toBe(false);

    pills(root)[0].click(); // desmarca una, vuelve a 4
    fixture.detectChanges();
    expect(finishButton.disabled).toBe(true);
  });
});

describe('RegistrationComponent — validación en vivo de alias (tarea 13.2)', () => {
  it('consulta GET /users/check-alias y muestra que está disponible', async () => {
    const { fixture, checkAliasSpy } = setup({ aliasAvailable: true });
    setInputValue(fixture, 'alias', 'ada');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(checkAliasSpy).toHaveBeenCalledWith('ada');
    const root = fixture.nativeElement as HTMLElement;
    const aliasInput = root.querySelector('#alias');
    // Acotado al propio grupo del campo alias: `name` también tiene su `.invalid-feedback` estático
    // en el DOM (oculto por CSS, no por `@if`) — un `querySelector` sobre todo `root` encontraría ese
    // primero en vez del de `alias`.
    const aliasGroup = aliasInput?.parentElement ?? null;
    expect(aliasInput?.classList.contains('is-valid')).toBe(true);
    expect(aliasGroup?.querySelector('.valid-feedback')?.textContent).toContain('disponible');
  });

  it('muestra que el alias ya está en uso sin bloquear el resto del formulario', async () => {
    const { fixture } = setup({ aliasAvailable: false });
    setInputValue(fixture, 'alias', 'ocupado');
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const aliasInput = root.querySelector('#alias');
    const aliasGroup = aliasInput?.parentElement ?? null;
    expect(aliasInput?.classList.contains('is-invalid')).toBe(true);
    expect(aliasGroup?.querySelector('.invalid-feedback')?.textContent).toContain('ya está en uso');
  });
});

describe('Cabecera de Shell A en completar perfil (tarea 13.3)', () => {
  it('muestra el botón de cerrar sesión pero no el enlace de Configuración ni el de chat', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: fakeAuthService(true) },
        { provide: ChatService, useValue: fakeChatService() },
        {
          provide: UsersService,
          useValue: {
            checkAlias: () => of({ available: true }),
            createProfile: () => of({}),
            invalidateOwnProfile: () => undefined,
          },
        },
        { provide: QualitiesService, useValue: { getAll: () => of(QUALITIES) } },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/registration');
    await harness.fixture.whenStable();
    harness.detectChanges();

    const root = harness.fixture.nativeElement as HTMLElement;
    const navItems = Array.from(root.querySelectorAll('.navbar-nav .nav-item'));
    expect(navItems.length).toBe(1);
    expect(navItems[0].textContent).toContain('Cerrar sesión');
    expect(root.querySelector('.navbar-nav')?.textContent).not.toContain('Configuración');
    expect(root.querySelector('.navbar-nav')?.textContent).not.toContain('Chats');
  });
});

describe('RegistrationComponent — responsive (tarea 21.3)', () => {
  it('el formulario de completar perfil (pasos 1 y 2) no genera scroll horizontal en viewport móvil (~375px)', async () => {
    const { fixture } = setup({ qualities: QUALITIES });

    await fillValidStep1(fixture);
    await expectNoHorizontalOverflow(fixture.nativeElement as HTMLElement, 375);

    goToStep2(fixture);
    await expectNoHorizontalOverflow(fixture.nativeElement as HTMLElement, 375);
  });
});
