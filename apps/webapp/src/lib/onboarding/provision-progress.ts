export type ProvisionProgressStepId
	= | 'school'
		| 'academic'
		| 'structure'
		| 'staff'
		| 'complete'
		| 'bootstrap';

export interface ProvisionProgressStepDef {
	id: ProvisionProgressStepId;
	/** Suffix for `onboarding.provision.step.${suffix}` */
	labelKeySuffix: string;
	weight: number;
}

export interface ProvisionProgressStep {
	id: ProvisionProgressStepId;
	labelKey: string;
	weight: number;
}

export interface ProvisionProgressEstimate {
	percent: number;
	activeStepId: string;
	completedIds: string[];
}

/** Cap while the provision HTTP request is still in flight. */
export const PROVISION_WAIT_ASYMPTOTE = 88;

/** Time constant for asymptotic wait progress (~63% of asymptote at this elapsed ms). */
const WAIT_TAU_MS = 6_500;

const PROVISION_PROGRESS_STEPS: ProvisionProgressStepDef[] = [
	{ id: 'school', labelKeySuffix: 'school', weight: 12 },
	{ id: 'academic', labelKeySuffix: 'academic', weight: 14 },
	{ id: 'structure', labelKeySuffix: 'structure', weight: 36 },
	{ id: 'staff', labelKeySuffix: 'staff', weight: 14 },
	{ id: 'complete', labelKeySuffix: 'complete', weight: 10 },
	{ id: 'bootstrap', labelKeySuffix: 'bootstrap', weight: 14 },
];

const SERVER_PHASE_TO_STEP: Record<string, ProvisionProgressStepId> = {
	registerSchool: 'school',
	resolveOwnerActor: 'school',
	ensureAcademicStructure: 'academic',
	applyStructureTemplate: 'structure',
	'structure.curriculum': 'structure',
	'structure.classMirrors': 'structure',
	'structure.reportCards': 'structure',
	inviteStaffMembers: 'staff',
	completeWizard: 'complete',
};

function toProgressStep(def: ProvisionProgressStepDef): ProvisionProgressStep {
	return {
		id: def.id,
		labelKey: `onboarding.provision.step.${def.labelKeySuffix}`,
		weight: def.weight,
	};
}

export function getProvisionProgressSteps(options: {
	includeStaff: boolean;
}): ProvisionProgressStep[] {
	return PROVISION_PROGRESS_STEPS
		.filter(step => options.includeStaff || step.id !== 'staff')
		.map(toProgressStep);
}

/**
 * Estimated progress while waiting on POST onboarding/provision.
 * Approaches ~88% asymptotically (structure-weighted step walk); never reaches 100.
 */
export function estimateProvisionPercent(
	elapsedMs: number,
	includeStaff: boolean,
): ProvisionProgressEstimate {
	const waitSteps = getProvisionProgressSteps({ includeStaff })
		.filter(step => step.id !== 'bootstrap');
	const totalWeight = waitSteps.reduce((sum, step) => sum + step.weight, 0);
	const raw = PROVISION_WAIT_ASYMPTOTE * (1 - Math.exp(-Math.max(0, elapsedMs) / WAIT_TAU_MS));
	const percent = Math.min(raw, PROVISION_WAIT_ASYMPTOTE - 0.05);

	const progressAlong = (percent / PROVISION_WAIT_ASYMPTOTE) * totalWeight;
	const completedIds: string[] = [];
	let activeStepId = waitSteps[0]?.id ?? 'school';
	let cumulative = 0;

	for (const step of waitSteps) {
		if (progressAlong >= cumulative + step.weight) {
			completedIds.push(step.id);
			cumulative += step.weight;
			continue;
		}
		activeStepId = step.id;
		break;
	}

	// Keep the last wait step active rather than marking everything complete early.
	if (completedIds.length === waitSteps.length && waitSteps.length > 0) {
		activeStepId = waitSteps[waitSteps.length - 1]!.id;
		completedIds.pop();
	}

	return { percent, activeStepId, completedIds };
}

export function mapServerPhaseToStepId(phase: string): string | null {
	if (SERVER_PHASE_TO_STEP[phase]) {
		return SERVER_PHASE_TO_STEP[phase]!;
	}
	if (phase.startsWith('structure.')) {
		return 'structure';
	}
	return null;
}
