/** Behavioral search/filter contracts live in read-workflows, keyed by stable scenario ID. */
import type { DemoContext } from '../tests/integration/demo-dry-run/support/types';
import type { QaTemplateRow } from './qa-template-matrix';
import type { MatrixEntities, MatrixResult } from './qa-matrix-support';

export function isFilterOrSearchRow(action: string): boolean {
  return /filtre/i.test(action) || action === 'Recherche' || action === 'Liste — affichage / recherche';
}

export async function runFilterScenario(row: QaTemplateRow, _ctx: DemoContext, _entities: MatrixEntities): Promise<MatrixResult | null> {
  if (!isFilterOrSearchRow(row.action)) return null;
  return { ...row, statut: 'NOT OK', blocked: true, detail: 'Missing executable filter contract; register assertions for included and excluded fixture rows' };
}
