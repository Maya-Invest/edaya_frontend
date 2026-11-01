import { AsyncLocalStorage } from 'node:async_hooks';

export interface VisualCheckpoint<C = ScenarioContext> {
	id: string;
	title: string;
	surface: string;
	ready: (context: C) => Promise<void>;
}

export interface ScenarioStep<C = ScenarioContext> {
	id: string;
	run: (context: C) => Promise<void>;
	checkpoint?: VisualCheckpoint<C>;
}

/** Browser-specific contexts extend this lifecycle contract. */
export interface ScenarioContext {
	fixtures: Record<string, unknown>;
	registerCleanup: (cleanup: () => void | Promise<void>) => void;
}

export interface ScenarioDefinition<C = ScenarioContext> {
	id: string;
	feature: string;
	dependsOn?: readonly string[];
	fixtureRequirements?: readonly string[];
	steps?: readonly ScenarioStep<C>[];
}

export interface ScenarioResult {
	id: string;
	feature: string;
	status: 'passed' | 'failed' | 'blocked';
	durationMs: number;
	detail?: string;
	profile?: 'integration' | 'screenshots';
	completion?: 'scenario' | 'checkpoint';
	checkpoints?: string[];
}

export function validateScenarios<C>(scenarios: readonly ScenarioDefinition<C>[]): void {
	const ids = new Set<string>();
	for (const scenario of scenarios) {
		if (!scenario.id || !scenario.feature || ids.has(scenario.id)) {
			throw new Error(`Invalid or duplicate scenario: ${scenario.id}`);
		}
		ids.add(scenario.id);
		if (scenario.steps?.length === 0) throw new Error(`${scenario.id}: no executable steps`);
		const steps = new Set<string>();
		const checkpoints = new Set<string>();
		for (const step of scenario.steps ?? []) {
			if (!step.id || steps.has(step.id)) throw new Error(`${scenario.id}: duplicate or empty step ${step.id}`);
			steps.add(step.id);
			if (step.checkpoint) {
				if (!step.checkpoint.id || checkpoints.has(step.checkpoint.id)) throw new Error(`${scenario.id}: duplicate or empty checkpoint`);
				checkpoints.add(step.checkpoint.id);
			}
		}
	}
	if (!ids.size) throw new Error('No integration scenarios registered');
	const visiting = new Set<string>();
	const visited = new Set<string>();
	const byId = new Map(scenarios.map(scenario => [scenario.id, scenario]));
	const visit = (id: string) => {
		if (visiting.has(id)) throw new Error(`Scenario dependency cycle: ${id}`);
		if (visited.has(id)) return;
		const scenario = byId.get(id);
		if (!scenario) throw new Error(`Missing dependency: ${id}`);
		visiting.add(id);
		for (const dependency of scenario.dependsOn ?? []) visit(dependency);
		visiting.delete(id);
		visited.add(id);
	};
	for (const scenario of scenarios) visit(scenario.id);
}

export function selectScenarios<C>(scenarios: readonly ScenarioDefinition<C>[], selection?: readonly string[]): ScenarioDefinition<C>[] {
	validateScenarios(scenarios);
	const byId = new Map(scenarios.map(scenario => [scenario.id, scenario]));
	const selected: ScenarioDefinition<C>[] = [];
	const visited = new Set<string>();
	const visit = (id: string) => {
		if (visited.has(id)) return;
		const scenario = byId.get(id);
		if (!scenario) throw new Error(`Unknown scenario: ${id}`);
		for (const dependency of scenario.dependsOn ?? []) visit(dependency);
		visited.add(id);
		selected.push(scenario);
	};
	for (const id of selection ?? scenarios.map(scenario => scenario.id)) visit(id);
	if (!selected.length) throw new Error('No scenarios selected');
	return selected;
}

const active = new AsyncLocalStorage<{ scenarioId: string; context: ScenarioContext }>();
export function activeScenario(): { scenarioId: string; context: ScenarioContext } | undefined {
	return active.getStore();
}

export interface RunScenarioOptions<C extends ScenarioContext> {
	profile?: 'integration' | 'screenshots';
	select?: readonly string[];
	/** One checkpoint per selected scenario; dependencies run to completion. */
	targets?: Readonly<Record<string, string>>;
	createContext?: (scenario: ScenarioDefinition<C>, registerCleanup: ScenarioContext['registerCleanup']) => Promise<C>;
	execute?: (scenario: ScenarioDefinition<C>, context: C) => Promise<void>;
	onCheckpoint?: (checkpoint: VisualCheckpoint<C>, context: C, scenario: ScenarioDefinition<C>) => Promise<void>;
	onFailure?: (error: unknown, context: C, scenario: ScenarioDefinition<C>) => Promise<void>;
}

/** A failing dependency blocks its descendants, never independent scenarios. */
export async function runScenarios<C extends ScenarioContext = ScenarioContext>(
	scenarios: readonly ScenarioDefinition<C>[],
	run: ((scenario: ScenarioDefinition<C>) => Promise<void>) | RunScenarioOptions<C>,
): Promise<ScenarioResult[]> {
	const options: RunScenarioOptions<C> = typeof run === 'function' ? { execute: run } : run;
	const selected = selectScenarios(scenarios, options.select);
	const profile = options.profile ?? 'integration';
	if (profile === 'integration' && options.targets) throw new Error('Checkpoint stopping requires screenshot profile');
	if (profile === 'screenshots' && (!options.onCheckpoint || !options.targets || !Object.keys(options.targets).length)) {
		throw new Error('Screenshot profile requires checkpoint targets and a capture collector');
	}
	for (const [id, target] of Object.entries(options.targets ?? {})) {
		if (!selected.some(scenario => scenario.id === id && scenario.steps?.some(step => step.checkpoint?.id === target))) {
			throw new Error(`Unknown selected checkpoint: ${id}/${target}`);
		}
	}
	const results: ScenarioResult[] = [];
	for (const scenario of selected) {
		const blocked = scenario.dependsOn?.filter(id => results.find(result => result.id === id)?.status !== 'passed');
		if (blocked?.length) {
			results.push({ id: scenario.id, feature: scenario.feature, status: 'blocked', durationMs: 0, detail: `Dependencies failed: ${blocked.join(', ')}` });
			continue;
		}
		const started = Date.now();
		const cleanups: Array<() => void | Promise<void>> = [];
		let context: C | undefined;
		const checkpoints: string[] = [];
		let failure: unknown;
		let failed = false;
		const target = options.targets?.[scenario.id];
		try {
			context = options.createContext ? await options.createContext(scenario, cleanup => cleanups.push(cleanup)) : {
				fixtures: {}, registerCleanup: (cleanup: () => void | Promise<void>) => { cleanups.push(cleanup); },
			} as unknown as C;
			await active.run({ scenarioId: scenario.id, context }, async () => {
				for (const fixture of scenario.fixtureRequirements ?? []) {
					if (context!.fixtures[fixture] == null) throw new Error(`Missing fixture: ${fixture}`);
				}
				if (scenario.steps) {
					for (const step of scenario.steps) {
						await step.run(context!);
						if (step.checkpoint) {
							await step.checkpoint.ready(context!);
							if (profile !== 'screenshots' || step.checkpoint.id === target) await options.onCheckpoint?.(step.checkpoint, context!, scenario);
							checkpoints.push(step.checkpoint.id);
							if (step.checkpoint.id === target) break;
						}
					}
				} else if (options.execute) await options.execute(scenario, context!);
				else throw new Error(`No executable steps or handler: ${scenario.id}`);
			});
		}
		catch (error) {
			failed = true;
			failure = error;
			if (context) {
				try { await options.onFailure?.(error, context, scenario); }
				catch (captureError) { failure = new Error(`${String(error)}; diagnostic capture: ${String(captureError)}`); }
			}
		}
		finally {
			for (const cleanup of cleanups.reverse()) {
				try { await cleanup(); }
				catch (error) { failed = true; failure ??= error; }
			}
		}
		results.push({ id: scenario.id, feature: scenario.feature, status: failed ? 'failed' : 'passed',
			durationMs: Date.now() - started, profile, completion: target ? 'checkpoint' : 'scenario', checkpoints,
			...(failed ? { detail: redactDiagnostic(String(failure)) } : {}) });
	}
	return results;
}

export function assertCompleteResults<C>(scenarios: readonly ScenarioDefinition<C>[], results: readonly ScenarioResult[]): void {
	validateScenarios(scenarios);
	const ids = new Set(results.map(result => result.id));
	if (ids.size !== results.length) throw new Error('Duplicate scenario results');
	const expected = new Set(scenarios.map(scenario => scenario.id));
	const errors = [
		...scenarios.filter(scenario => !ids.has(scenario.id)).map(scenario => `Missing result: ${scenario.id}`),
		...results.filter(result => !expected.has(result.id)).map(result => `Unknown result: ${result.id}`),
		...results.filter(result => result.status !== 'passed').map(result => `${result.id}: ${result.status}`),
		...results.filter(result => result.profile === 'screenshots' || result.completion === 'checkpoint').map(result => `${result.id}: checkpoint capture is not integration completion`),
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
