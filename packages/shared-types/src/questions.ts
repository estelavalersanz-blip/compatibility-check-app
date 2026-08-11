/**
 * Las 36 preguntas del cuestionario de compatibilidad, agrupadas en 6 bloques de 6 (`block`
 * 1-6, mismo agrupamiento que los lotes de IA y el cálculo ponderado — design.md, decisión 6c).
 * Transcritas literalmente desde `supabase/seed/seed-users.json` (fuente única, no se
 * reinventan aquí) para que el seed y el catálogo real del cuestionario nunca diverjan.
 */
export interface Question {
  id: number;
  block: number;
  text: string;
}

export const QUESTIONS: readonly Question[] = [
  {
    id: 1,
    block: 1,
    text: 'Si pudieras invitar a cenar a cualquier persona del mundo, viva o no, ¿a quién elegirías y por qué?',
  },
  {
    id: 2,
    block: 1,
    text: '¿Qué significa para ti tener una "vida perfecta"?',
  },
  {
    id: 3,
    block: 1,
    text: 'Antes de hacer una llamada importante, ¿sueles ensayar lo que vas a decir? ¿Por qué?',
  },
  {
    id: 4,
    block: 1,
    text: 'Para ti, ¿qué tienen en común un "día perfecto" y un día cualquiera?',
  },
  {
    id: 5,
    block: 1,
    text: '¿Cuándo fue la última vez que cantaste, solo/a o delante de alguien?',
  },
  {
    id: 6,
    block: 1,
    text: 'Si pudieras vivir 90 años con la mente o el cuerpo de una persona de 30 durante tus últimos 60, ¿qué elegirías?',
  },
  {
    id: 7,
    block: 2,
    text: '¿Tienes alguna intuición sobre cómo te gustaría que fuera tu vejez?',
  },
  {
    id: 8,
    block: 2,
    text: 'Nombra tres cosas que crees que tienes en común con la mayoría de tus amistades cercanas.',
  },
  {
    id: 9,
    block: 2,
    text: '¿Por qué parte de tu vida sientes más gratitud ahora mismo?',
  },
  {
    id: 10,
    block: 2,
    text: 'Si pudieras cambiar algo de cómo te educaron, ¿qué sería?',
  },
  {
    id: 11,
    block: 2,
    text: 'Resume la historia de tu vida en pocas frases, con el mayor detalle que puedas.',
  },
  {
    id: 12,
    block: 2,
    text: 'Si mañana despertaras con una habilidad o cualidad nueva, ¿cuál elegirías?',
  },
  {
    id: 13,
    block: 3,
    text: 'Si pudieras saber una verdad segura sobre tu futuro, ¿qué preguntarías?',
  },
  {
    id: 14,
    block: 3,
    text: '¿Hay algo que llevas tiempo queriendo hacer? ¿Qué te ha frenado?',
  },
  {
    id: 15,
    block: 3,
    text: '¿Cuál consideras el mayor logro de tu vida hasta ahora?',
  },
  {
    id: 16,
    block: 3,
    text: '¿Qué es lo que más valoras en una amistad?',
  },
  {
    id: 17,
    block: 3,
    text: '¿Cuál es tu recuerdo más preciado?',
  },
  {
    id: 18,
    block: 3,
    text: '¿Cuál es el recuerdo más difícil que llevas contigo?',
  },
  {
    id: 19,
    block: 4,
    text: 'Si supieras que vas a morir de repente dentro de un año, ¿cambiarías tu forma de vivir ahora? ¿Cómo?',
  },
  {
    id: 20,
    block: 4,
    text: '¿Qué significa la amistad para ti?',
  },
  {
    id: 21,
    block: 4,
    text: '¿Qué papel juegan el amor y el afecto en tu día a día?',
  },
  {
    id: 22,
    block: 4,
    text: 'Menciona algo que consideres un rasgo positivo tuyo.',
  },
  {
    id: 23,
    block: 4,
    text: '¿Dirías que tu familia es cercana y cálida? ¿Sientes que tu infancia fue feliz?',
  },
  {
    id: 24,
    block: 4,
    text: '¿Cómo describirías tu relación con tu madre o figura materna?',
  },
  {
    id: 25,
    block: 5,
    text: 'Completa la frase: "Ojalá tuviera a alguien con quien compartir...".',
  },
  {
    id: 26,
    block: 5,
    text: 'Si fueras a hacerte amigo/a cercano/a de alguien, ¿qué es algo importante que debería saber de ti?',
  },
  {
    id: 27,
    block: 5,
    text: '¿Qué es lo que más te gusta de ti mismo/a, siendo muy honesto/a?',
  },
  {
    id: 28,
    block: 5,
    text: 'Comparte un momento embarazoso de tu vida.',
  },
  {
    id: 29,
    block: 5,
    text: '¿Cuándo lloraste por última vez delante de alguien? ¿Y a solas?',
  },
  {
    id: 30,
    block: 5,
    text: '¿Qué es algo que ya te gusta de tu forma de relacionarte con los demás?',
  },
  {
    id: 31,
    block: 6,
    text: '¿Qué tema consideras demasiado serio como para bromear con él?',
  },
  {
    id: 32,
    block: 6,
    text: 'Si murieras esta noche sin poder hablar con nadie más, ¿qué lamentarías no haber dicho? ¿Por qué no lo has dicho aún?',
  },
  {
    id: 33,
    block: 6,
    text: 'Tu casa se incendia y ya has puesto a salvo a tus seres queridos y mascotas. Tienes tiempo de entrar una vez más a salvar un objeto. ¿Cuál sería y por qué?',
  },
  {
    id: 34,
    block: 6,
    text: '¿La pérdida de qué familiar te resultaría más difícil de afrontar? ¿Por qué?',
  },
  {
    id: 35,
    block: 6,
    text: 'Comparte un problema personal que tengas ahora y cómo sueles afrontarlo.',
  },
  {
    id: 36,
    block: 6,
    text: '¿Qué necesitas sentir para considerar sólida y duradera una relación, de pareja o de amistad?',
  },
] as const;
