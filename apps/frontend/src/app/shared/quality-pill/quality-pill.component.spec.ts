import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QualityPillComponent } from './quality-pill.component';

/**
 * Monta la píldora sola, sin componente anfitrión ni routing: los tres inputs son de señal
 * (`input`/`input.required`), así que `componentRef.setInput(...)` antes del primer `detectChanges()`
 * basta para fijarlos. `label` es `input.required`, así que se asigna siempre (con un valor por
 * defecto si el test no lo usa) — si no, Angular lanza NG0950 al leerlo en la plantilla.
 */
function createPill(
  options: { label?: string; selected?: boolean; selectedCount?: number } = {},
): { fixture: ComponentFixture<QualityPillComponent>; button: HTMLButtonElement } {
  const fixture = TestBed.createComponent(QualityPillComponent);
  fixture.componentRef.setInput('label', options.label ?? 'Empática');
  fixture.componentRef.setInput('selected', options.selected ?? false);
  fixture.componentRef.setInput('selectedCount', options.selectedCount ?? 0);
  fixture.detectChanges();

  const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button');
  if (!button) {
    throw new Error('No se encontró el botón de la píldora');
  }
  return { fixture, button };
}

/**
 * `shared/quality-pill` no tenía spec propio: a diferencia del resto de piezas de las secciones 13/17,
 * su comportamiento solo se ejercitaba de forma indirecta a través de `RegistrationComponent`
 * (tarea 13.1) y `SettingsComponent` (sección 17). Se añade aquí en aislado, sin montar ningún wizard
 * alrededor, para fijar el contrato del componente compartido (design.md decisión 3d-bis) de forma
 * independiente de sus dos consumidores.
 */
describe('QualityPillComponent (tarea 13.4, sin test propio en tasks.md)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [QualityPillComponent],
    });
  });

  it('sin seleccionar: no tiene la clase de seleccionada y aria-pressed es "false"', () => {
    const { button } = createPill({ selected: false });

    expect(button.classList.contains('quality-pill--selected')).toBe(false);
    // `[attr.aria-pressed]`, no `[aria-pressed]` de propiedad: un binding de atributo estampa el
    // string literal "false"/"true" en el DOM (a diferencia de un binding de propiedad, donde `false`
    // quitaría el atributo) — por eso se compara contra el string, no contra el booleano.
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('seleccionada (selected=true): tiene la clase quality-pill--selected y aria-pressed es "true"', () => {
    const { button } = createPill({ selected: true });

    expect(button.classList.contains('quality-pill--selected')).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('al hacer clic, emite el evento toggled', () => {
    const { fixture, button } = createPill();
    // `toggled` es `output()` (API de función), no `@Output() = new EventEmitter()`: no es un
    // `Observable` completo, pero `OutputEmitterRef.subscribe(callback)` existe justo para esto en
    // tests — sirve de spy igual que `spyOn` sobre el `.emit` de un `EventEmitter` clásico.
    const toggledSpy = jasmine.createSpy('toggled');
    fixture.componentInstance.toggled.subscribe(toggledSpy);

    button.click();

    expect(toggledSpy).toHaveBeenCalledTimes(1);
  });

  it('con selectedCount=5 y selected=false (no es una de las 5 marcadas), el botón queda disabled', () => {
    const { button } = createPill({ selected: false, selectedCount: 5 });

    expect(button.disabled).toBe(true);
  });

  it('con selectedCount=5 y selected=true (sí es una de las 5 marcadas), el botón no está disabled', () => {
    // Desmarcar debe seguir permitido aunque ya haya 5: el tope solo bloquea marcar una sexta, nunca
    // desmarcar una de las ya elegidas (design.md decisión 3d-bis).
    const { button } = createPill({ selected: true, selectedCount: 5 });

    expect(button.disabled).toBe(false);
  });

  it('con selectedCount menor que 5, nunca está disabled sea cual sea selected', () => {
    const { button: sinSeleccionar } = createPill({ selected: false, selectedCount: 4 });
    expect(sinSeleccionar.disabled).toBe(false);

    const { button: seleccionada } = createPill({ selected: true, selectedCount: 4 });
    expect(seleccionada.disabled).toBe(false);
  });
});
