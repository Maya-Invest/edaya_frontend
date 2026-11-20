import type { AcademicYearStatus } from '$lib/types/school';

export const ACADEMIC_MODAL_NAMES = [
	'create',
	'edit-year',
	'create-period',
	'edit-period',
	'delete-year',
	'delete-period',
	'archive-year',
	'publish-year',
	'publish-period',
] as const;

export type AcademicModalName = (typeof ACADEMIC_MODAL_NAMES)[number];

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
		academicYearId: string;
		status: AcademicYearStatus;
	}[];
}

export function academicActionReason(
	modal: AcademicModalName,
	target: string | null,
	catalog: AcademicModalCatalog,
): string | undefined {
	if (modal === 'create')
		return undefined;
	const periodAction = ['edit-period', 'delete-period', 'publish-period'].includes(modal);
	const period = periodAction ? catalog.periods.find(entry => entry.id === target) : undefined;
	const year = catalog.years.find(entry => entry.id === (periodAction ? period?.academicYearId : target));
	if (!year || (periodAction && !period))
		return 'academic.targetUnavailable';
	if (year.status === 'archived')
		return 'academic.archivedReadOnly';
	if (modal === 'publish-year') {
		if (year.status !== 'draft')
			return 'academic.draftRequired';
		if (catalog.years.some(entry => entry.status === 'published'))
			return 'academic.publishBlocked';
	}
	if (modal === 'archive-year' && year.status !== 'published')
		return 'academic.publishedRequired';
	if (modal === 'delete-year') {
		if (year.status !== 'draft')
			return 'academic.draftRequired';
		if (catalog.periods.some(entry => entry.academicYearId === year.id))
			return 'academic.removePeriodsFirst';
	}
	if ((modal === 'delete-period' || modal === 'publish-period') && period?.status !== 'draft')
		return 'academic.draftRequired';
	return undefined;
}

export function isAcademicModalTargetValid(
	modal: AcademicModalName | null,
	target: string | null,
	catalog: AcademicModalCatalog,
): boolean {
	return modal === null || academicActionReason(modal, target, catalog) === undefined;
}
