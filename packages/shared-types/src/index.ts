export * from './answer-set';
export * from './comparison-result';
export * from './aggregated-result';
export * from './comparison-summary';
export * from './comparison-detail';
export * from './quality';
// Re-exportación explícita, NO `export * from './questions'` (a diferencia del resto de este
// fichero): `QUESTIONS` es el primer VALOR en tiempo de ejecución (no solo un tipo) que
// `apps/frontend` importa de `shared-types` — descubierto durante la sección 14. TypeScript compila
// `export *` a un helper `__exportStar` que copia propiedades dinámicamente (`for...in` en tiempo de
// ejecución), un patrón que Node/Jest resuelven sin problema pero que el dev server de Angular
// (`ng serve`, interop CJS→ESM nativo del navegador) no puede analizar estáticamente — daba
// `SyntaxError: ... does not provide an export named 'QUESTIONS'` solo en `ng serve`, nunca en
// `ng build`/Karma/el backend (bundlers de un solo paso, o `require()` real de Node). Una
// re-exportación NOMBRADA como esta compila a un `Object.defineProperty` estático, visible para ese
// análisis. Si algún día otro módulo de este barrel expone un valor real que el frontend necesite
// importar, aplícale el mismo patrón en vez de `export *`.
export { QUESTIONS, type Question } from './questions';
export * from './user-profile';
export * from './message';
export * from './conversation';
