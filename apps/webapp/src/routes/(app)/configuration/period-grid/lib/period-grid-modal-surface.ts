export const PERIOD_GRID_MODAL_NAMES = [
	'period-def',
	'period-def-wizard',
	'delete-period-def',
] as const;

export type PeriodGridModalName = (typeof PERIOD_GRID_MODAL_NAMES)[number];

export function allowedPeriodGridModalNames(
	canConfigureSchoolStructure: boolean,
): readonly PeriodGridModalName[] {
	if (canConfigureSchoolStructure) {
		return PERIOD_GRID_MODAL_NAMES;
	}
	return [];
}

export const PERIOD_DEFINITION_WIZARD_STEPS = ['preset', 'tweak', 'preview'] as const;
export type PeriodDefinitionWizardStep = (typeof PERIOD_DEFINITION_WIZARD_STEPS)[number];

export class PeriodGridWizardObservationGuard {
	private wasOpen = false;

	observe(isOpen: boolean): boolean {
		const firstOpenObservation = isOpen && !this.wasOpen;
		this.wasOpen = isOpen;
		return firstOpenObservation;
	}
}

export interface PeriodGridModalCatalog {
	years: readonly { id: string }[];
	periodDefinitions: readonly {
		id: string;
		academicYearId: string;
	}[];
}

export type PeriodDefinitionModalTarget
	= | {
		mode: 'create';
		academicYearId: string;
		periodDefinitionId: null;
	}
	| {
		mode: 'edit';
		academicYearId: string;
		periodDefinitionId: string;
	};

export function resolvePeriodDefinitionModalTarget(
	target: string | null,
	catalog: PeriodGridModalCatalog,
): PeriodDefinitionModalTarget | null {
	if (!target) {
		return null;
	}
	const periodDefinition = catalog.periodDefinitions.find(entry => entry.id === target);
	if (periodDefinition) {
		return {
			mode: 'edit',
			academicYearId: periodDefinition.academicYearId,
			periodDefinitionId: periodDefinition.id,
		};
	}
	if (catalog.years.some(entry => entry.id === target)) {
		return {
			mode: 'create',
			academicYearId: target,
			periodDefinitionId: null,
		};
	}
	return null;
}

export function isPeriodGridModalTargetValid(
	modal: PeriodGridModalName | null,
	target: string | null,
	catalog: PeriodGridModalCatalog,
): boolean {
	if (modal === null) {
		return true;
	}
	if (modal === 'period-def') {
		return resolvePeriodDefinitionModalTarget(target, catalog) !== null;
	}
	if (!target) {
		return false;
	}
	if (modal === 'period-def-wizard') {
		return catalog.years.some(entry => entry.id === target);
	}
	return catalog.periodDefinitions.some(entry => entry.id === target);
}

export function canonicalPeriodGridModalStep(
	modal: PeriodGridModalName | null,
	step: string | null,
	options: { resetAdvancedWizardStep: boolean },
): PeriodDefinitionWizardStep | null {
	if (modal !== 'period-def-wizard') {
		return null;
	}
	if (options.resetAdvancedWizardStep) {
		return 'preset';
	}
	return step !== null
		&& (PERIOD_DEFINITION_WIZARD_STEPS as readonly string[]).includes(step)
		? step as PeriodDefinitionWizardStep
		: 'preset';
}
