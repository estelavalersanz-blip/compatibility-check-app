import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OwnUserProfile } from '@compatibility-check-app/shared-types';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { UsersService } from './users.service';

const PROFILE_URL = `${environment.apiBaseUrl}/users/me`;

function ownProfile(): OwnUserProfile {
  return {
    id: 'user-1',
    name: 'Ada',
    alias: 'ada',
    photoUrl: null,
    questionnaireCompletedAt: null,
    needsRecalculation: false,
    qualityIds: [],
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('cachea GET /users/me: dos llamadas seguidas solo disparan una petición HTTP (tarea 11.6)', async () => {
    const first = firstValueFrom(service.getOwnProfile());
    const second = firstValueFrom(service.getOwnProfile());

    httpMock.expectOne(PROFILE_URL).flush(ownProfile());

    expect(await first).toEqual(ownProfile());
    expect(await second).toEqual(ownProfile());
    httpMock.verify(); // ninguna petición adicional pendiente
  });

  it('traduce un 404 a null (sin fila de perfil todavía), sin lanzar', async () => {
    const result = firstValueFrom(service.getOwnProfile());

    httpMock.expectOne(PROFILE_URL).flush(null, { status: 404, statusText: 'Not Found' });

    expect(await result).toBeNull();
  });

  it('invalidateOwnProfile() fuerza a repetir la consulta la próxima vez', async () => {
    const first = firstValueFrom(service.getOwnProfile());
    httpMock.expectOne(PROFILE_URL).flush(ownProfile());
    await first;

    service.invalidateOwnProfile();

    const second = firstValueFrom(service.getOwnProfile());
    httpMock.expectOne(PROFILE_URL).flush(ownProfile());
    expect(await second).toEqual(ownProfile());
  });

  it('propaga errores que no son 404 (p. ej. un 500) en vez de convertirlos en null', async () => {
    const result = firstValueFrom(service.getOwnProfile());
    const req = httpMock.expectOne(PROFILE_URL);
    req.flush('boom', { status: 500, statusText: 'Server Error' });

    await expectAsync(result).toBeRejectedWith(jasmine.any(HttpErrorResponse));
  });
});
