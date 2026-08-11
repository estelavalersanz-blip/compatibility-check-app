import { answerSetSchema } from './answer-set';

function buildValidAnswerSet(
  overrides: Partial<{ questionId: number; question: string; answer: string }>[] = [],
) {
  return Array.from({ length: 36 }, (_, i) => ({
    questionId: i + 1,
    question: `Pregunta número ${i + 1}`,
    answer: `Respuesta a la pregunta ${i + 1}`,
    ...overrides[i],
  }));
}

describe('answerSetSchema', () => {
  it('acepta un array de exactamente 36 elementos con {questionId, question, answer}', () => {
    const result = answerSetSchema.safeParse(buildValidAnswerSet());

    expect(result.success).toBe(true);
  });

  it('rechaza un array con menos de 36 elementos', () => {
    const result = answerSetSchema.safeParse(buildValidAnswerSet().slice(0, 35));

    expect(result.success).toBe(false);
  });

  it('rechaza un array con más de 36 elementos', () => {
    const tooMany = [...buildValidAnswerSet(), { questionId: 37, question: 'Extra', answer: 'x' }];

    const result = answerSetSchema.safeParse(tooMany);

    expect(result.success).toBe(false);
  });

  it('rechaza un elemento al que le falta la clave `answer`', () => {
    const invalid = buildValidAnswerSet();
    delete (invalid[0] as Partial<(typeof invalid)[number]>).answer;

    const result = answerSetSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it('rechaza un elemento con `answer` vacío', () => {
    const invalid = buildValidAnswerSet();
    invalid[0].answer = '';

    const result = answerSetSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it('rechaza un elemento con `questionId` que no es un número', () => {
    const invalid = buildValidAnswerSet() as unknown[];
    (invalid[0] as Record<string, unknown>).questionId = 'uno';

    const result = answerSetSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });
});
