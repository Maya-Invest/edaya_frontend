import type { AcademicModalCatalog } from '../../../../../src/routes/(app)/configuration/academic/lib/academic-modal-surface';
import { describe, expect, it } from 'bun:test';
import {
	ACADEMIC_MODAL_NAMES,
	isAcademicModalTargetValid,
	snapshotAcademicMutationTarget,
} from '../../../../../src/routes/(app)/configuration/academic/lib/academic-modal-surface';

const modalCatalog: AcademicModalCatalog = {
	years: [{ id: 'year-1', status: 'draft' }],
	periods: [{ id: 'period-1', academicYearId: 'year-1', status: 'draft' }],
};

describe('academic route helpers', () => {
	it('requires a resolvable target for every target-backed modal', () => {
		for (const modal of ACADEMIC_MODAL_NAMES.filter(modal => modal !== 'create')) {
			expect(isAcademicModalTargetValid(modal, null, modalCatalog)).toBe(false);
			expect(isAcademicModalTargetValid(modal, 'missing', modalCatalog)).toBe(false);
		}

		expect(isAcademicModalTargetValid('publish-year', 'year-1', modalCatalog)).toBe(true);
		expect(isAcademicModalTargetValid('publish-period', 'period-1', modalCatalog)).toBe(true);
		expect(isAcademicModalTargetValid('archive-year', 'period-1', modalCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('publish-period', 'year-1', modalCatalog)).toBe(false);
	});

	it('owns the year and period modal keys', () => {
		expect(ACADEMIC_MODAL_NAMES).toEqual([
			'create',
			'edit-year',
			'create-period',
			'edit-period',
			'delete-year',
			'delete-period',
			'archive-year',
			'publish-year',
			'publish-period',
		]);
	});

	it('requires publish and archive targets to satisfy the UI status rules', () => {
		const publishedCatalog: AcademicModalCatalog = {
			...modalCatalog,
			years: [{ id: 'year-1', status: 'published' }],
			periods: [{ id: 'period-1', academicYearId: 'year-1', status: 'published' }],
		};
		const archivedCatalog: AcademicModalCatalog = {
			...modalCatalog,
			years: [{ id: 'year-1', status: 'archived' }],
		};
		const blockedPublishCatalog: AcademicModalCatalog = {
			...modalCatalog,
			years: [
				{ id: 'year-1', status: 'archived' },
				{ id: 'year-2', status: 'published' },
			],
		};

		expect(isAcademicModalTargetValid('archive-year', 'year-1', modalCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('archive-year', 'year-1', archivedCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('archive-year', 'year-1', publishedCatalog)).toBe(true);
		expect(isAcademicModalTargetValid('publish-year', 'year-1', modalCatalog)).toBe(true);
		expect(isAcademicModalTargetValid('publish-year', 'year-1', archivedCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('publish-year', 'year-1', publishedCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('publish-year', 'year-1', blockedPublishCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('publish-period', 'period-1', publishedCatalog)).toBe(false);
	});

	it('snapshots mutation identity before refreshed route data can change', () => {
		const target = { id: 'year-1', label: '2025–2026' };
		const snapshot = snapshotAcademicMutationTarget(target);

		target.id = 'year-2';
		target.label = 'Changed';

		expect(snapshot).toEqual({ id: 'year-1', label: '2025–2026' });
	});
});
