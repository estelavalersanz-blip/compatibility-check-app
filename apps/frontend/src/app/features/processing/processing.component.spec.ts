import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ComparisonSummary } from '@compatibility-check-app/shared-types';
import { of } from 'rxjs';
import { ComparisonsService } from '../../core/comparisons.service';
import { ProcessingComponent } from './processing.component';

function fakeComparison(overrides: Partial<ComparisonSummary> = {}): ComparisonSummary {
  return {
    id: 'cmp-1',
    status: 'pending',
    candidate: {
      id: 'user-2',
      name: 'Bea',
      alias: 'bea',
      photoUrl: 'https://example.com/bea.jpg',
      questionnaireCompletedAt: '2024-01-01T00:00:00.000Z',
    },
    sharedQualitiesCount: 3,
    result: null,
    ...overrides,
  };
}

function setup(comparisons: ComparisonSummary[]) {
  const findMineSpy = jasmine.createSpy('findMine').and.returnValue(of(comparisons));

  TestBed.configureTestingModule({
    imports: [ProcessingComponent],
    providers: [
      provideRouter([{ path: 'dashboard', component: ProcessingComponent }]),
      { provide: ComparisonsService, useValue: { findMine: findMineSpy } },
    ],
  });

  const fixture = TestBed.createComponent(ProcessingComponent);
  fixture.detectChanges();
  return { fixture, findMineSpy };
}

function root(fixture: ComponentFixture<ProcessingComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('ProcessingComponent (tarea 15.1)', () => {
  it('muestra un spinner y una fila por candidato con su icono de estado', () => {
    const { fixture } = setup([
      fakeComparison({ id: 'cmp-1', status: 'pending' }),
      fakeComparison({ id: 'cmp-2', status: 'completed' }),
      fakeComparison({ id: 'cmp-3', status: 'error' }),
    ]);
    const view = root(fixture);

    expect(view.querySelector('.spinner-border.text-primary')).not.toBeNull();
    const rows = view.querySelectorAll('.list-group-item');
    expect(rows.length).toBe(3);
    expect(rows[0].querySelector('.spinner-border.spinner-border-sm')).not.toBeNull();
    expect(rows[1].querySelector('.bi-check-circle-fill')).not.toBeNull();
    expect(rows[2].querySelector('.bi-exclamation-triangle')).not.toBeNull();
  });

  it('nunca muestra un porcentaje agregado ni un contador "N de 3"', () => {
    const { fixture } = setup([
      fakeComparison({ id: 'cmp-1', status: 'pending' }),
      fakeComparison({ id: 'cmp-2', status: 'completed' }),
    ]);
    const text = root(fixture).textContent ?? '';

    expect(text).not.toContain('%');
    expect(text).not.toMatch(/\d\s*de\s*\d/);
  });

  it('se detiene y navega al dashboard en cuanto todas las comparaciones están completed/error', async () => {
    const { fixture } = setup([
      fakeComparison({ id: 'cmp-1', status: 'completed' }),
      fakeComparison({ id: 'cmp-2', status: 'error' }),
    ]);
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });

  it('no navega mientras quede al menos una comparación pendiente', async () => {
    const { fixture } = setup([
      fakeComparison({ id: 'cmp-1', status: 'completed' }),
      fakeComparison({ id: 'cmp-2', status: 'pending' }),
    ]);
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('con una lista vacía (sin candidatos todavía, o nunca), no navega', async () => {
    const { fixture } = setup([]);
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(root(fixture).querySelectorAll('.list-group-item').length).toBe(0);
  });
});
