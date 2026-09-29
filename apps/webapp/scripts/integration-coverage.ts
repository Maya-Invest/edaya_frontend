import { assertCurrentExecution } from '../tests/integration/support/execution-metadata';
import webadmin from '../tests/integration/webadmin/scenarios.json';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ONBOARDING_SCENARIOS } from '../tests/integration/onboarding/scenarios';
import { assertCompleteResults } from '../tests/integration/support/scenario-registry';
import { assertFeatureRegistration, assertMatrixExecution } from '../tests/integration/support/coverage-contract';

const root = resolve(import.meta.dirname, '..');
assertFeatureRegistration();
if (!process.argv.includes('--registration-only')) {
	for (const directory of ['.onboarding-run', '.integration-run', '.webadmin-run']) assertCurrentExecution(resolve(root, directory));
	const onboarding = JSON.parse(readFileSync(resolve(root, '.onboarding-run/summary.json'), 'utf8'));
	assertCompleteResults(ONBOARDING_SCENARIOS, onboarding.scenes ?? []);
	const matrix = JSON.parse(readFileSync(resolve(root, '.integration-run/qa-matrix-results.json'), 'utf8'));
	assertMatrixExecution(matrix.results ?? []);
	const provisioned = JSON.parse(readFileSync(resolve(root, '.integration-run/summary.json'), 'utf8'));
	if (provisioned.ok !== true) throw new Error('Provisioned suite failed or required fixture setup did not complete');
	const admin = JSON.parse(readFileSync(resolve(root, '.webadmin-run/summary.json'), 'utf8'));
	assertCompleteResults(webadmin.map(row => ({ id: row.id, feature: 'webadmin.navigation' })), admin.outcomes); 
}
console.log('Required integration coverage validated');
