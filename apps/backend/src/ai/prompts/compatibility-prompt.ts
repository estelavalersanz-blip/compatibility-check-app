/** Una pregunta del cuestionario junto con la respuesta de cada uno de los dos usuarios comparados. */
export interface PromptQuestionPair {
  questionId: number;
  question: string;
  answerUser1: string;
  answerUser2: string;
}

/**
 * Prompt de sistema "psicólogo especializado en relaciones" (tarea 9.5, ai-compatibility-analysis
 * spec) — fijo para todos los lotes: define el rol, las claves exactas del JSON esperado (mismas
 * que `comparisonResultSchema` de `shared-types`, design.md decisión 5d) y el rango/formato de cada
 * puntuación. No incluye datos de usuario — esos van en el prompt de usuario, por lote.
 */
export function buildSystemPrompt(): string {
  return `Eres un psicólogo especializado en relaciones de pareja y compatibilidad interpersonal, con
experiencia evaluando afinidad a partir de respuestas escritas a un cuestionario.

Tu tarea es comparar, pregunta por pregunta, la respuesta de dos personas y evaluar su compatibilidad
en varias dimensiones psicológicas. Debes responder ÚNICAMENTE con un array JSON válido — sin texto
antes ni después, sin bloques de código markdown — con exactamente un objeto por cada pregunta
recibida, EN EL MISMO ORDEN en que se te presenten.

Cada objeto del array debe tener EXACTAMENTE estas claves, ni una más ni una menos:
- "pregunta": el texto literal de la pregunta recibida
- "id_usuario_1": el identificador del primer usuario, tal como se te indique
- "respuesta_usuario_1": la respuesta literal del primer usuario
- "id_usuario_2": el identificador del segundo usuario, tal como se te indique
- "respuesta_usuario_2": la respuesta literal del segundo usuario
- "compatibilidad": puntuación general (número) de cuán compatibles son estas dos respuestas concretas
- "emocional": puntuación de compatibilidad emocional reflejada en esta respuesta
- "valores": puntuación de compatibilidad de valores personales
- "estilo": puntuación de compatibilidad de estilo comunicativo
- "intereses": puntuación de compatibilidad de intereses
- "madurez": puntuación de compatibilidad de madurez emocional
- "apertura": puntuación de compatibilidad de apertura a nuevas experiencias
- "explicación": una justificación breve (1-2 frases, en español) de la puntuación de "compatibilidad"

Todas las puntuaciones son números entre 1.00 y 10.00, con como máximo 2 decimales. Básate
únicamente en el contenido real de las respuestas dadas — no inventes información que no esté en
ellas.`;
}

/**
 * Prompt de usuario para un lote concreto (6 preguntas, design.md decisión 6): las respuestas reales
 * de ambos usuarios, nunca en el prompt de sistema para no repetirlas en cada lote de la misma
 * comparación innecesariamente mezcladas con las instrucciones fijas.
 */
export function buildUserPrompt(
  pairs: PromptQuestionPair[],
  user1Id: string,
  user2Id: string,
): string {
  const questionsBlock = pairs
    .map(
      (pair, index) =>
        `${index + 1}. Pregunta: "${pair.question}"\n` +
        `   Respuesta de "${user1Id}": "${pair.answerUser1}"\n` +
        `   Respuesta de "${user2Id}": "${pair.answerUser2}"`,
    )
    .join('\n\n');

  return (
    `Compara las siguientes ${pairs.length} preguntas y respuestas entre los usuarios "${user1Id}" ` +
    `y "${user2Id}":\n\n${questionsBlock}\n\n` +
    `Devuelve el array JSON con ${pairs.length} objetos, en el mismo orden que las preguntas anteriores.`
  );
}

/**
 * Variante de corrección (design.md, decisión 6: "reenviando el lote con instrucción de
 * corrección") usada en los reintentos tras una respuesta inválida — mismo contenido más una
 * instrucción explícita señalando el motivo del rechazo, sin repetir el prompt de sistema.
 */
export function buildCorrectionPrompt(
  pairs: PromptQuestionPair[],
  user1Id: string,
  user2Id: string,
  previousErrorReason: string,
): string {
  return (
    `${buildUserPrompt(pairs, user1Id, user2Id)}\n\n` +
    `Tu respuesta anterior no era válida (${previousErrorReason}). Corrígela: responde ` +
    `EXCLUSIVAMENTE con el array JSON válido, con las claves exactas indicadas y sin texto adicional.`
  );
}
