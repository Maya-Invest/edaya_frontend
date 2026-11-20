export function assertAvailabilityResults(summary: { outcomes?: Array<{ scenario: string; status: string }> }): void {
	const required = ['en.disabled', 'en.failed', 'en.enabled', 'fr.disabled', 'fr.failed', 'fr.enabled'];
	const outcomes = summary.outcomes ?? [];
	if (outcomes.length !== required.length || new Set(outcomes.map(row => row.scenario)).size !== required.length || required.some(scenario => !outcomes.some(row => row.scenario === scenario && row.status === 'passed'))) {
		throw new Error('Availability suite is missing required successful scenarios');
	}
}

export function assertDemoResults(summary: { passed?: number; failed?: number; skipped?: number; results?: Array<{ status: string }> }): void {
	const results = summary.results ?? [];
	if (results.length === 0 || summary.passed !== results.length || summary.failed !== 0 || summary.skipped !== 0 || results.some(row => row.status !== 'pass')) {
		throw new Error('Demo suite is missing complete successful execution');
	}
}
