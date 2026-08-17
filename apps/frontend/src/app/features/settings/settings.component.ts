import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OwnUserProfile, Quality } from '@compatibility-check-app/shared-types';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { MatchingService } from '../../core/matching.service';
import { QualitiesService } from '../../core/qualities.service';
import { UsersService } from '../../core/users.service';
import { aliasAvailableValidator } from '../../shared/alias-available.validator';
import { passwordMinLengthValidator, passwordsMatchValidator } from '../../shared/password-validators';
import { QualityPillComponent } from '../../shared/quality-pill/quality-pill.component';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;
const REQUIRED_QUALITY_COUNT = 5;

interface QualityOption extends Quality {
  selected: boolean;
}

/** `true` si ambos arrays contienen exactamente los mismos ids, sin importar el orden. */
function sameQualitySelection(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, index) => id === sortedB[index]);
}

/**
 * Configuración de perfil (sección 17; spec `user-settings`). A diferencia de
 * `features/registration` (wizard de 2 pasos, sección 13), aquí las mismas reglas de alias/cualidades
 * se aplican en **un único formulario** — design.md decisión 3e es explícita en que el wizard de 2
 * pasos es solo para el alta, no para editar un perfil ya existente.
 *
 * "Caso especial" nuevo de `page-template.md` (documentado ahí): 3 cards apiladas en vez de una sola,
 * porque son 3 acciones independientes con su propio guardado (perfil, contraseña, cuestionario) — no
 * una única entidad que editar de una vez, a diferencia del resto de pantallas de Shell A.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, QualityPillComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly qualitiesService = inject(QualitiesService);
  private readonly matchingService = inject(MatchingService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  readonly loading = signal(true);

  readonly profileForm = this.fb.group({
    name: ['', [Validators.required]],
    alias: ['', [Validators.required], [aliasAvailableValidator(this.usersService)]],
  });

  readonly photoFile = signal<File | null>(null);
  readonly photoPreviewUrl = signal<string | null>(null);
  readonly photoError = signal<string | null>(null);

  readonly qualities = signal<Quality[]>([]);
  readonly qualitiesLoading = signal(true);
  readonly selectedQualityIds = signal<string[]>([]);
  private originalQualityIds: string[] = [];
  readonly qualityOptions = computed<QualityOption[]>(() => {
    const selected = this.selectedQualityIds();
    return this.qualities().map((quality) => ({ ...quality, selected: selected.includes(quality.id) }));
  });

  readonly questionnaireCompletedAt = signal<string | null>(null);

  readonly profileSubmitting = signal(false);
  readonly profileError = signal<string | null>(null);
  readonly showRecalculateBanner = signal(false);
  readonly recalculating = signal(false);

  readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      password: ['', [Validators.required, passwordMinLengthValidator]],
      passwordConfirm: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );
  readonly passwordSubmitting = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSuccess = signal(false);

  constructor() {
    // Primera carga con suscripción directa, nunca envuelta en un timer/interval (gotcha zoneless ya
    // conocido, ver core/shell/shell.component.ts).
    this.usersService.getOwnProfile().subscribe({
      next: (profile) => {
        if (profile) {
          this.applyProfile(profile);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.qualitiesService.getAll().subscribe({
      next: (list) => {
        this.qualities.set(list);
        this.qualitiesLoading.set(false);
      },
      error: () => this.qualitiesLoading.set(false),
    });
  }

  /** Carga inicial: sí prerellena `name`/`alias` en el formulario (dispara la validación en vivo del
   *  alias una vez, como es esperable al montar la pantalla). */
  private applyProfile(profile: OwnUserProfile): void {
    this.profileForm.patchValue({ name: profile.name, alias: profile.alias });
    this.applyNonFormFields(profile);
  }

  /**
   * Tras un guardado con éxito: NO vuelve a `patchValue` sobre `name`/`alias` — el formulario ya
   * muestra exactamente lo que se acaba de enviar y el backend lo ha aceptado tal cual, así que
   * re-parchearlo solo dispararía de nuevo, sin necesidad, la validación asíncrona del alias contra
   * `GET /users/check-alias`. Sí actualiza el resto de campos derivados de la respuesta del servidor
   * (foto, cualidades "originales" para el próximo guardado, fecha del cuestionario).
   */
  private applyNonFormFields(profile: OwnUserProfile): void {
    const previousPreview = this.photoPreviewUrl();
    if (previousPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(previousPreview);
    }
    this.photoPreviewUrl.set(profile.photoUrl);
    this.selectedQualityIds.set(profile.qualityIds);
    this.originalQualityIds = profile.qualityIds;
    this.questionnaireCompletedAt.set(profile.questionnaireCompletedAt);
  }

  /** El alias es válido y la comprobación en vivo ya resolvió (no `pending`) — disponible. */
  aliasAvailable(): boolean {
    const alias = this.profileForm.controls.alias;
    return alias.valid && !alias.pending;
  }

  pickPhoto(): void {
    this.fileInput().nativeElement.click();
  }

  /** Misma validación de cliente que `features/registration` (jpg/png/webp ≤2MB) — a diferencia del
   *  registro, elegir una foto nueva aquí es opcional: si no se toca, se conserva la ya guardada. */
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      this.photoError.set('Usa una foto en formato jpg, png o webp.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      this.photoError.set('La foto no puede superar los 2MB.');
      return;
    }

    this.photoError.set(null);
    const previousUrl = this.photoPreviewUrl();
    if (previousUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previousUrl);
    }
    this.photoFile.set(file);
    this.photoPreviewUrl.set(URL.createObjectURL(file));
  }

  onToggleQuality(qualityId: string): void {
    const current = this.selectedQualityIds();
    if (current.includes(qualityId)) {
      this.selectedQualityIds.set(current.filter((id) => id !== qualityId));
      return;
    }
    if (current.length < REQUIRED_QUALITY_COUNT) {
      this.selectedQualityIds.set([...current, qualityId]);
    }
  }

  profileInvalid(): boolean {
    return (
      this.profileForm.invalid ||
      this.profileForm.pending ||
      this.selectedQualityIds().length !== REQUIRED_QUALITY_COUNT
    );
  }

  async saveProfile(): Promise<void> {
    if (this.profileInvalid() || this.profileSubmitting()) {
      return;
    }

    this.profileSubmitting.set(true);
    this.profileError.set(null);
    this.showRecalculateBanner.set(false);
    const { name, alias } = this.profileForm.getRawValue();
    const qualityIds = this.selectedQualityIds();
    // Ver nota en `settings.component.spec.ts` (tarea 17.1b): `PATCH /users/me` en el backend solo
    // escribe `needs_recalculation = true` cuando las cualidades cambian, pero nunca lo resetea a
    // `false` cuando no cambian, así que la respuesta podría traer `needsRecalculation: true` heredado
    // de un recálculo pendiente ajeno a este guardado. El aviso se basa en si ESTE guardado cambió la
    // selección, no solo en el valor crudo de la respuesta.
    const qualitiesChangedInThisSave = !sameQualitySelection(this.originalQualityIds, qualityIds);
    const photo = this.photoFile() ?? undefined;

    try {
      const updated = await firstValueFrom(this.usersService.updateProfile({ name, alias, qualityIds, photo }));
      this.usersService.invalidateOwnProfile();
      this.applyNonFormFields(updated);
      this.photoFile.set(null);
      if (qualitiesChangedInThisSave && updated.needsRecalculation) {
        this.showRecalculateBanner.set(true);
      }
    } catch (error) {
      this.profileError.set(
        error instanceof HttpErrorResponse && error.status === 409
          ? 'Ese alias ya está en uso.'
          : 'No se pudieron guardar los cambios. Inténtalo de nuevo.',
      );
    } finally {
      this.profileSubmitting.set(false);
    }
  }

  /** Atajo de configuración (design.md decisión 3h) — mismo endpoint que el botón del dashboard
   *  (sección 16), pero este sí navega al dashboard al terminar (tarea 17.1b). */
  async recalculateNow(): Promise<void> {
    this.recalculating.set(true);
    try {
      await firstValueFrom(this.matchingService.recalculate());
      this.usersService.invalidateOwnProfile();
      await this.router.navigate(['/dashboard']);
    } finally {
      this.recalculating.set(false);
    }
  }

  /** Design.md decisión 7b: reautenticación explícita antes de cambiar la contraseña — reintenta
   *  `signInWithPassword` con la contraseña actual y solo si es correcta llama a `updateUser`. */
  async changePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.passwordSubmitting.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);
    const { currentPassword, password } = this.passwordForm.getRawValue();
    const email = this.authService.session()?.user.email ?? '';

    try {
      await this.authService.signInWithPassword(email, currentPassword);
    } catch {
      this.passwordError.set('La contraseña actual no es correcta.');
      this.passwordSubmitting.set(false);
      return;
    }

    try {
      await this.authService.updatePassword(password);
      this.passwordForm.reset();
      this.passwordSuccess.set(true);
    } catch {
      this.passwordError.set('No se pudo actualizar la contraseña. Inténtalo de nuevo.');
    } finally {
      this.passwordSubmitting.set(false);
    }
  }
}
