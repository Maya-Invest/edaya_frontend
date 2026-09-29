export interface ScenarioDefinition {
	id: string;
	feature: string;
	dependsOn?: readonly string[];
}

export interface ScenarioResult {
	id: string;
	feature: string;
	status: 'passed' | 'failed' | 'blocked';
	durationMs: number;
	detail?: string;
}

export function validateScenarios(scenarios: readonly ScenarioDefinition[]): void {
	const ids = new Set<string>();
	for (const scenario of scenarios) {
		if (!scenario.id || !scenario.feature || ids.has(scenario.id)) {
			throw new Error(`Invalid or duplicate scenario: ${scenario.id}`);
		}
		for (const dependency of scenario.dependsOn ?? []) {
			if (!ids.has(dependency)) throw new Error(`${scenario.id}: missing or unordered dependency ${dependency}`);
		}
		ids.add(scenario.id);
	}
	if (!ids.size) throw new Error('No integration scenarios registered');
}

/** A failing dependency blocks its descendants, never independent scenarios. */
export async function runScenarios(
	scenarios: readonly ScenarioDefinition[],
	run: (scenario: ScenarioDefinition) => Promise<void>,
): Promise<ScenarioResult[]> {
	validateScenarios(scenarios);
	const results: ScenarioResult[] = [];
	for (const scenario of scenarios) {
		const blocked = scenario.dependsOn?.filter(id => results.find(result => result.id === id)?.status !== 'passed');
		if (blocked?.length) {
			results.push({ id: scenario.id, feature: scenario.feature, status: 'blocked', durationMs: 0, detail: `Dependencies failed: ${blocked.join(', ')}` });
			continue;
		}
		const started = Date.now();
		try {
			await run(scenario);
			results.push({ id: scenario.id, feature: scenario.feature, status: 'passed', durationMs: Date.now() - started });
		}
		catch (error) {
			results.push({ id: scenario.id, feature: scenario.feature, status: 'failed', durationMs: Date.now() - started, detail: redactDiagnostic(String(error)) });
		}
	}
	return results;
}

export function assertCompleteResults(scenarios: readonly ScenarioDefinition[], results: readonly ScenarioResult[]): void {
	validateScenarios(scenarios);
	const ids = new Set(results.map(result => result.id));
	if (ids.size !== results.length) throw new Error('Duplicate scenario results');
	const expected = new Set(scenarios.map(scenario => scenario.id));
	const errors = [
		...scenarios.filter(scenario => !ids.has(scenario.id)).map(scenario => `Missing result: ${scenario.id}`),
		...results.filter(result => !expected.has(result.id)).map(result => `Unknown result: ${result.id}`),
		...results.filter(result => result.status !== 'passed').map(result => `${result.id}: ${result.status}`),
	];
	if (errors.length) throw new Error(errors.join('\n'));
}

export function redactDiagnostic(value: string): string {
	return value
		.replace(/\b\d{6}\b/g, '[redacted-code]')
		.replace(/(\.fill\()[^\n]+/g, '$1[redacted])')
		.replace(/(\/invite\/)[^/?\s"']+/g, '$1[redacted]')
		.replace(/((?:authorization|cookie|token|secret|password|otp|recoveryCode)["']?\s*[:=]\s*)[^\s,}\n]+/gi, '$1[redacted]')
		.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}
