import type { AcademicYearStatus } from '$lib/types/school';

export const ACADEMIC_MODAL_NAMES = [
	'create',
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
		status: AcademicYearStatus;
	}[];
}

export function isAcademicModalTargetValid(
	modal: AcademicModalName | null,
	target: string | null,
	catalog: AcademicModalCatalog,
): boolean {
	if (modal === null || modal === 'create') {
		return true;
	}
	if (!target) {
		return false;
	}
	if (modal === 'archive-year') {
		return catalog.years.some(entry => entry.id === target && entry.status === 'published');
	}
	if (modal === 'publish-year') {
		return catalog.years.some(entry => entry.id === target && entry.status !== 'published')
			&& !catalog.years.some(entry => entry.status === 'published');
	}
	return catalog.periods.some(entry => entry.id === target && entry.status === 'draft');
}
