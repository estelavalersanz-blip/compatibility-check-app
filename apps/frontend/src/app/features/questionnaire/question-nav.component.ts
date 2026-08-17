import { Component, input, output } from '@angular/core';

/** Forma mínima que necesita la navegación: el resto de datos de la pregunta viven en el padre. */
export interface QuestionNavItem {
  id: number;
  answered: boolean;
}

/**
 * Navegación de puntos + flechas entre las 6 preguntas del bloque activo del cuestionario (sección
 * 14; ui-design-consistency SKILL.md, "Navegación entre las 6 preguntas del bloque activo"). Alcance
 * local al bloque activo — el padre (`QuestionnaireComponent`) reinicia `currentIndex`/
 * `maxReachedIndex` al cambiar de bloque; este componente no conoce el concepto de "bloque" en sí,
 * solo la lista de preguntas que le pasan.
 */
@Component({
  selector: 'app-question-nav',
  standalone: true,
  templateUrl: './question-nav.component.html',
  styleUrl: './question-nav.component.scss',
})
export class QuestionNavComponent {
  readonly questions = input.required<QuestionNavItem[]>();
  readonly currentIndex = input.required<number>();
  readonly maxReachedIndex = input.required<number>();
  readonly indexChange = output<number>();

  previousQuestion(): void {
    if (this.currentIndex() > 0) {
      this.indexChange.emit(this.currentIndex() - 1);
    }
  }

  nextQuestion(): void {
    if (this.currentIndex() < this.questions().length - 1) {
      this.indexChange.emit(this.currentIndex() + 1);
    }
  }

  /** Solo emite si `index` ya fue visitado (`<= maxReachedIndex`) — mismo criterio que los tramos
   *  de bloque de la barra de progreso, un nivel más abajo. */
  goToQuestion(index: number): void {
    if (index <= this.maxReachedIndex()) {
      this.indexChange.emit(index);
    }
  }
}
