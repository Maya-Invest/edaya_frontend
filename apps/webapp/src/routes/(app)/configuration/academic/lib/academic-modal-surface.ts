import type { AcademicYearStatus } from '$lib/types/school';

export const ACADEMIC_MODAL_NAMES = [
	'create',
	'period-def',
	'period-def-wizard',
	'delete-period-def',
	'archive-year',
	'publish-year',
	'publish-period',
] as const;

export type AcademicModalName = (typeof ACADEMIC_MODAL_NAMES)[number];

export const ACADEMIC_STRUCTURE_CONFIGURE_MODAL_NAMES = [
	'period-def',
	'period-def-wizard',
	'delete-period-def',
] as const satisfies readonly AcademicModalName[];

export function allowedAcademicModalNames(
	canConfigureSchoolStructure: boolean,
): readonly AcademicModalName[] {
	if (canConfigureSchoolStructure) {
		return ACADEMIC_MODAL_NAMES;
	}
	return ACADEMIC_MODAL_NAMES.filter(
		modal => !(ACADEMIC_STRUCTURE_CONFIGURE_MODAL_NAMES as readonly AcademicModalName[])
			.includes(modal),
	);
}

export const PERIOD_DEFINITION_WIZARD_STEPS = ['preset', 'tweak', 'preview'] as const;
export type PeriodDefinitionWizardStep = (typeof PERIOD_DEFINITION_WIZARD_STEPS)[number];

export class AcademicWizardObservationGuard {
	private wasOpen = false;

	observe(isOpen: boolean): boolean {
		const firstOpenObservation = isOpen && !this.wasOpen;
		this.wasOpen = isOpen;
		return firstOpenObservation;
	}
}

export function snapshotAcademicMutationTarget(
	target: { id: string; label: string },
): { id: string; label: string } {
	return {
		id: target.id,
		label: target.label,
	};
}

export interface AcademicModalCatalog {
	years: readonly {
		id: string;
		status: AcademicYearStatus;
	}[];
	periods: readonly {
		id: string;
		status: AcademicYearStatus;
	}[];
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
	catalog: AcademicModalCatalog,
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

export function isAcademicModalTargetValid(
	modal: AcademicModalName | null,
	target: string | null,
	catalog: AcademicModalCatalog,
): boolean {
	if (modal === null || modal === 'create') {
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
	if (modal === 'archive-year') {
		return catalog.years.some(entry => entry.id === target && entry.status === 'published');
	}
	if (modal === 'publish-year') {
		return catalog.years.some(entry => entry.id === target && entry.status === 'draft')
			&& !catalog.years.some(entry => entry.status === 'published');
	}
	if (modal === 'delete-period-def') {
		return catalog.periodDefinitions.some(entry => entry.id === target);
	}
	return catalog.periods.some(entry => entry.id === target && entry.status === 'draft');
}

export function canonicalAcademicModalStep(
	modal: AcademicModalName | null,
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
