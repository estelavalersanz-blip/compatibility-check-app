import { ConflictException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Answer } from '@compatibility-check-app/shared-types';
import { CompleteQuestionnaireCommand } from './complete-questionnaire.command';
import { CompleteQuestionnaireHandler } from './complete-questionnaire.handler';
import { QuestionnaireCompletedEvent } from '../events/questionnaire-completed.event';
import { SupabaseService } from '../../supabase/supabase.service';

// Este archivo no importa nada de un futuro módulo `matching` (sección 8) — es, en sí mismo, la
// comprobación de "sin invocar directamente ningún servicio del módulo matching" (tarea 7.3): no
// hay nada de `matching` que mockear ni llamar porque el handler bajo prueba no lo conoce.

function buildAnswers(overrides: Partial<Record<number, Partial<Answer>>> = {}): Answer[] {
  return Array.from({ length: 36 }, (_, i) => ({
    questionId: i + 1,
    question: `Pregunta ${i + 1}`,
    answer: `Respuesta ${i + 1}`,
    ...overrides[i],
  }));
}

interface BuildOptions {
  questionnaireCompletedAt?: string | null;
  upsertError?: { message: string } | null;
  completeUpdateError?: { message: string } | null;
}

function buildSupabaseService(options: BuildOptions = {}): {
  supabaseService: SupabaseService;
  tablesTouched: string[];
} {
  const {
    questionnaireCompletedAt = null,
    upsertError = null,
    completeUpdateError = null,
  } = options;
  const tablesTouched: string[] = [];

  const fake = {
    getClient: () => ({
      from: (table: string) => {
        tablesTouched.push(table);

        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { questionnaire_completed_at: questionnaireCompletedAt },
                    error: null,
                  }),
              }),
            }),
            update: () => ({
              eq: () => ({
                select: () => ({
                  single: () =>
                    Promise.resolve({
                      data: completeUpdateError ? null : { id: 'user-row-id' },
                      error: completeUpdateError,
                    }),
                }),
              }),
            }),
          };
        }
        if (table === 'questionnaires') {
          return {
            upsert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: upsertError ? null : { id: 'questionnaire-row-id' },
                    error: upsertError,
                  }),
              }),
            }),
          };
        }
        throw new Error(`Tabla inesperada en el fake de test: ${table}`);
      },
    }),
  };

  return { supabaseService: fake as unknown as SupabaseService, tablesTouched };
}

describe('CompleteQuestionnaireHandler', () => {
  let eventBus: { publish: jest.Mock };

  beforeEach(() => {
    eventBus = { publish: jest.fn() };
  });

  it('rechaza con 400 si hay menos de 36 respuestas, sin consultar la base de datos', async () => {
    const { supabaseService, tablesTouched } = buildSupabaseService();
    const handler = new CompleteQuestionnaireHandler(
      supabaseService,
      eventBus as unknown as EventBus,
    );

    await expect(
      handler.execute(new CompleteQuestionnaireCommand('user-1', buildAnswers().slice(0, 35))),
    ).rejects.toThrow(/36 preguntas/);
    expect(tablesTouched).toHaveLength(0);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('rechaza con 400 si hay preguntas duplicadas, sin consultar la base de datos', async () => {
    const { supabaseService, tablesTouched } = buildSupabaseService();
    const handler = new CompleteQuestionnaireHandler(
      supabaseService,
      eventBus as unknown as EventBus,
    );
    const duplicated = buildAnswers();
    duplicated[1] = { ...duplicated[1], questionId: duplicated[0].questionId };

    await expect(
      handler.execute(new CompleteQuestionnaireCommand('user-1', duplicated)),
    ).rejects.toThrow(/más de una vez/);
    expect(tablesTouched).toHaveLength(0);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('rechaza con 409 si el usuario ya completó su cuestionario, sin escribir nada', async () => {
    const { supabaseService } = buildSupabaseService({
      questionnaireCompletedAt: '2024-01-01T00:00:00.000Z',
    });
    const handler = new CompleteQuestionnaireHandler(
      supabaseService,
      eventBus as unknown as EventBus,
    );

    await expect(
      handler.execute(new CompleteQuestionnaireCommand('user-1', buildAnswers())),
    ).rejects.toThrow(ConflictException);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('persiste el cuestionario y publica QuestionnaireCompletedEvent con el userId', async () => {
    const { supabaseService } = buildSupabaseService({ questionnaireCompletedAt: null });
    const handler = new CompleteQuestionnaireHandler(
      supabaseService,
      eventBus as unknown as EventBus,
    );
    const answers = buildAnswers();

    const result = await handler.execute(new CompleteQuestionnaireCommand('user-1', answers));

    expect(result).toEqual(answers);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const [publishedEvent] = eventBus.publish.mock.calls[0] as [QuestionnaireCompletedEvent];
    expect(publishedEvent).toBeInstanceOf(QuestionnaireCompletedEvent);
    expect(publishedEvent.userId).toBe('user-1');
  });

  it('propaga el error si no se pudo guardar el cuestionario, sin publicar el evento', async () => {
    const { supabaseService } = buildSupabaseService({
      questionnaireCompletedAt: null,
      upsertError: { message: 'network down' },
    });
    const handler = new CompleteQuestionnaireHandler(
      supabaseService,
      eventBus as unknown as EventBus,
    );

    await expect(
      handler.execute(new CompleteQuestionnaireCommand('user-1', buildAnswers())),
    ).rejects.toThrow(/network down/);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
