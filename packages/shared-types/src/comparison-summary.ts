import { AggregatedResult } from './aggregated-result';
import { UserProfile } from './user-profile';

/**
 * Una fila de `GET /users/me/comparisons` — estado de la comparación, datos del candidato para
 * mostrar la tarjeta (alias, foto — `UserProfile` completo, aunque el dashboard, sección 16, elija
 * no mostrar `name`) y el resultado agregado solo cuando ya está disponible.
 */
export interface ComparisonSummary {
  id: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  candidate: UserProfile;
  sharedQualitiesCount: number;
  /** `null` hasta que la comparación está `completed`. */
  result: AggregatedResult | null;
}
