import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Quality } from '@compatibility-check-app/shared-types';
import { firstValueFrom } from 'rxjs';
import { QualitiesService } from '../../core/qualities.service';
import { UsersService } from '../../core/users.service';
import { aliasAvailableValidator } from '../../shared/alias-available.validator';
import { QualityPillComponent } from '../../shared/quality-pill/quality-pill.component';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;
const REQUIRED_QUALITY_COUNT = 5;

interface QualityOption extends Quality {
  selected: boolean;
}

/**
 * Completar perfil — registro paso 2 (sección 13; design.md decisión 3e; ui-design-consistency
 * SKILL.md, "Completar perfil: wizard de 2 pasos"). Shell A, caso especial: se enruta sin
 * `ProfileGuard` y con `data.minimalNav` en `app.routes.ts` (tarea 13.3, cabecera sin chat ni
 * configuración).
 *
 * Wizard de 2 pasos puramente de cliente (`currentStep`, sin llamada al backend entre ambos): paso 1
 * (foto + nombre + alias) solo valida y retiene el estado en memoria — "Siguiente" nunca llama a
 * `POST /users/me/profile`. El envío real ocurre una única vez, al pulsar "Finalizar" en el paso 2,
 * con los datos de ambos pasos juntos.
 */
@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [ReactiveFormsModule, QualityPillComponent],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.scss',
})
export class RegistrationComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly qualitiesService = inject(QualitiesService);
  private readonly router = inject(Router);

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  readonly step1Form = this.fb.group({
    name: ['', [Validators.required]],
    alias: ['', [Validators.required], [aliasAvailableValidator(this.usersService)]],
  });

  readonly currentStep = signal<0 | 1>(0);

  readonly photoFile = signal<File | null>(null);
  readonly photoPreviewUrl = signal<string | null>(null);
  readonly photoError = signal<string | null>(null);

  readonly qualities = signal<Quality[]>([]);
  readonly qualitiesLoading = signal(true);
  readonly selectedQualityIds = signal<string[]>([]);
  readonly qualityOptions = computed<QualityOption[]>(() => {
    const selected = this.selectedQualityIds();
    return this.qualities().map((quality) => ({ ...quality, selected: selected.includes(quality.id) }));
  });

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  constructor() {
    // Primera carga con suscripción directa, nunca envuelta en un timer/interval (gotcha zoneless ya
    // conocido, ver `core/shell/shell.component.ts`): sin zone.js, un `setTimeout` de 0ms es una
    // macrotarea real que `whenStable()` no espera.
    this.qualitiesService.getAll().subscribe({
      next: (list) => {
        this.qualities.set(list);
        this.qualitiesLoading.set(false);
      },
      error: () => this.qualitiesLoading.set(false),
    });
  }

  /** "Siguiente" permanece deshabilitado mientras foto/nombre/alias no sean válidos (tarea 13.0). */
  step1Invalid(): boolean {
    return this.step1Form.invalid || this.step1Form.pending || !this.photoFile();
  }

  /** El alias es válido y la comprobación en vivo ya resolvió (no `pending`) — disponible. */
  aliasAvailable(): boolean {
    const alias = this.step1Form.controls.alias;
    return alias.valid && !alias.pending;
  }

  pickPhoto(): void {
    this.fileInput().nativeElement.click();
  }

  /** Refuerzo cliente del mismo formato/tamaño que valida el backend (`photo-upload.service.ts`,
   *  jpg/png/webp ≤2MB) — el backend sigue siendo la validación real al enviar. */
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo fichero si se corrige el error
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
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
    }
    this.photoFile.set(file);
    this.photoPreviewUrl.set(URL.createObjectURL(file));
  }

  goToStep(step: 0 | 1): void {
    if (step === 1 && this.step1Invalid()) {
      return;
    }
    this.currentStep.set(step);
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

  /** "Finalizar" — único punto de envío real, con los datos de ambos pasos juntos (tarea 13.0). */
  async submit(): Promise<void> {
    const photo = this.photoFile();
    if (this.step1Invalid() || !photo || this.selectedQualityIds().length !== REQUIRED_QUALITY_COUNT) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    const { name, alias } = this.step1Form.getRawValue();
    try {
      await firstValueFrom(
        this.usersService.createProfile({ name, alias, qualityIds: this.selectedQualityIds(), photo }),
      );
      // Invalida la caché de `GET /users/me` (sección 11) para que `mainRouteGuard` vea el perfil
      // recién creado en vez de repetir el `null` cacheado desde antes del alta.
      this.usersService.invalidateOwnProfile();
      // Navega a la raíz y deja que `mainRouteGuard` decida (cuestionario, ya que el recién creado
      // nunca lo habrá completado) — no duplica esa lógica de resolución aquí.
      await this.router.navigate(['/']);
    } catch {
      this.submitError.set('No se pudo completar tu perfil. Inténtalo de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }
}
