import { BadRequestException } from '@nestjs/common';
import { Answer, answerSetSchema } from '@compatibility-check-app/shared-types';

/**
 * Validación compartida entre el envío inicial (`CompleteQuestionnaireCommandHandler`) y la edición
 * (`QuestionnairesService.replaceAnswers`) — misma regla en los dos flujos, sin duplicarla (mismo
 * principio que design.md, decisión 5b, aplicado aquí a la validación en vez de al recálculo).
 * Reutiliza `answerSetSchema` (`packages/shared-types`, sección 2) para exigir exactamente 36
 * elementos con la forma `{questionId, question, answer}` — es la primera vez que el backend
 * importa un valor real (no solo un tipo) de `shared-types`, apoyándose en el mismo `dist/`
 * compilado por el `postinstall` de la sección 5.
 */
export function parseCompleteAnswerSet(raw: unknown): Answer[] {
  const result = answerSetSchema.safeParse(raw);
  if (!result.success) {
    throw new BadRequestException(
      'El cuestionario debe incluir una respuesta válida para cada una de las 36 preguntas',
    );
  }

  assertNoDuplicateQuestions(result.data);
  return result.data;
}

/**
 * Borrador (design.md, decisión 5c): entre 0 y 36 respuestas, sin exigir el conjunto completo.
 * `answerSetSchema` no sirve aquí porque fija la longitud en exactamente 36 — se valida la forma de
 * cada elemento a mano, con las mismas reglas que `answerSchema` (Zod) pero sin `zod` como
 * dependencia directa del backend.
 */
export function parseDraftAnswerSet(raw: unknown): Answer[] {
  if (!Array.isArray(raw) || raw.length > 36) {
    throw new BadRequestException('El borrador no puede tener más de 36 respuestas');
  }

  const answers = raw.map((item, index) => parseSingleAnswer(item, index));
  assertNoDuplicateQuestions(answers);
  return answers;
}

function parseSingleAnswer(item: unknown, index: number): Answer {
  const record = item as Partial<Record<'questionId' | 'question' | 'answer', unknown>> | null;
  const questionId = record?.questionId;
  const question = record?.question;
  const answer = record?.answer;
  const isValid =
    typeof questionId === 'number' &&
    Number.isInteger(questionId) &&
    questionId > 0 &&
    typeof question === 'string' &&
    question.length > 0 &&
    typeof answer === 'string' &&
    answer.length > 0;

  if (!isValid) {
    throw new BadRequestException(
      `La respuesta en la posición ${index} no tiene la forma {questionId, question, answer}`,
    );
  }

  return { questionId, question, answer };
}

/** `answerSetSchema` valida la forma de cada elemento pero no la unicidad de `questionId`. */
function assertNoDuplicateQuestions(answers: Answer[]): void {
  const seen = new Set<number>();
  for (const { questionId } of answers) {
    if (seen.has(questionId)) {
      throw new BadRequestException(
        `La pregunta ${questionId} aparece más de una vez en el cuestionario`,
      );
    }
    seen.add(questionId);
  }
}
