import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QUESTIONS } from './questions';

describe('QUESTIONS', () => {
  it('tiene exactamente 36 preguntas, con ids únicos del 1 al 36', () => {
    expect(QUESTIONS).toHaveLength(36);

    const ids = QUESTIONS.map((q) => q.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
  });

  it('agrupa las preguntas en 6 bloques de 6, en el mismo orden que los lotes de IA', () => {
    for (let block = 1; block <= 6; block++) {
      const inBlock = QUESTIONS.filter((q) => q.block === block);
      expect(inBlock).toHaveLength(6);

      const expectedIds = Array.from({ length: 6 }, (_, i) => (block - 1) * 6 + i + 1);
      expect(inBlock.map((q) => q.id)).toEqual(expectedIds);
    }
  });

  it('coincide exactamente con las preguntas de supabase/seed/seed-users.json (fuente única)', () => {
    const seedPath = join(__dirname, '../../../supabase/seed/seed-users.json');
    const seed = JSON.parse(readFileSync(seedPath, 'utf-8')) as { questions: unknown[] };

    expect(QUESTIONS).toEqual(seed.questions);
  });
});
