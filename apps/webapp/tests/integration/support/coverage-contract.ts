import definitions from '../features.json';
import { QA_TEMPLATE_MATRIX } from '../../../scripts/qa-template-matrix';
import { filterRunnableMatrix } from '../../../scripts/qa-matrix-exclusions';
import type { MatrixResult } from '../../../scripts/qa-matrix-support';
import { validateScenarios } from './scenario-registry';

type Surface = { module: string; endpoint: string; action: string };
export const FEATURE_SCENARIOS = definitions;
export function surfaceKey(row: Surface): string {
	return `${row.module}::${row.endpoint.replace(/^https?:\/\/[^/]+/, '')}::${row.action}`;
}
export function assertFeatureRegistration(): void {
	validateScenarios(FEATURE_SCENARIOS);
	const keys = FEATURE_SCENARIOS.map(surfaceKey);
	if (new Set(keys).size !== keys.length) throw new Error('Duplicate registered feature action');
	const current = QA_TEMPLATE_MATRIX.filter(row => row.module !== 'Auth' && row.module !== 'Onboarding');
	const currentKeys = new Set(current.map(surfaceKey));
	const registered = new Set(keys);
	const errors = [
		...current.filter(row => !registered.has(surfaceKey(row))).map(row => `Unregistered current action: ${surfaceKey(row)}`),
		...FEATURE_SCENARIOS.filter(row => !currentKeys.has(surfaceKey(row))).map(row => `Removed action still registered: ${row.id}`),
	];
	if (errors.length) throw new Error(errors.join('\n'));
}
export function scenarioForSurface(row: Surface) {
	const definition = FEATURE_SCENARIOS.find(candidate => surfaceKey(candidate) === surfaceKey(row));
	if (!definition) throw new Error(`Unregistered executable action: ${surfaceKey(row)}`);
	return definition;
}
export function assertMatrixExecution(results: readonly MatrixResult[]): void {
	assertFeatureRegistration();
	const required = filterRunnableMatrix(QA_TEMPLATE_MATRIX);
	const expected = new Set(required.map(surfaceKey));
	const actual = new Set(results.map(surfaceKey));
	const errors = [
		...required.filter(row => !actual.has(surfaceKey(row))).map(row => `Missing required result: ${scenarioForSurface(row).id}`),
		...results.filter(row => !expected.has(surfaceKey(row))).map(row => `Unexpected result: ${surfaceKey(row)}`),
		...results.filter(row => expected.has(surfaceKey(row)) && row.id !== scenarioForSurface(row).id).map(row => `Missing or incorrect scenario ID: ${surfaceKey(row)}`),
		...results.filter(row => row.statut !== 'OK').map(row => `${surfaceKey(row)}: ${row.statut}`),
	];
	if (!results.length) errors.push('Zero executed integration scenarios');
	if (actual.size !== results.length) errors.push('Duplicate integration results');
	if (errors.length) throw new Error(errors.join('\n'));
}
