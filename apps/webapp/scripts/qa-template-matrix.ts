/**
 * Matrice QA complète — endpoints + actions par module.
 * Manual rows: qa-template-matrix.manual.ts
 * Generated rows: qa-template-matrix.generated.ts (bun run qa:matrix:sync)
 *
 * Automated runs use QA_TEMPLATE_MATRIX_RUNNABLE (excludes Auth, Onboarding,
 * Outils & imports, /login, /configuration/tools — manual testing only).
 */export type { QaModule, QaTemplateRow } from './qa-template-matrix.manual';
export { QA_TEMPLATE_MATRIX_MANUAL } from './qa-template-matrix.manual';

import type { QaTemplateRow } from './qa-template-matrix.manual';
import { QA_TEMPLATE_MATRIX_MANUAL } from './qa-template-matrix.manual';
import { QA_TEMPLATE_MATRIX_GENERATED } from './qa-template-matrix.generated';
import { filterRunnableMatrix } from './qa-matrix-exclusions';

export { QA_TEMPLATE_MATRIX_GENERATED };

export const QA_TEMPLATE_MATRIX: QaTemplateRow[] = [
	...QA_TEMPLATE_MATRIX_MANUAL,
	...QA_TEMPLATE_MATRIX_GENERATED,
];

/** Matrix rows executed by qa-matrix-run / integration (excludes manual-only areas). */
export const QA_TEMPLATE_MATRIX_RUNNABLE = filterRunnableMatrix(QA_TEMPLATE_MATRIX);
