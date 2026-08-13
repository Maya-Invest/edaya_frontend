import { describe, expect, it } from 'bun:test';
import { emptyAcademicSlice } from '../../../../../src/routes/(app)/configuration/academic/lib/academic-helpers';
import {
	ACADEMIC_MODAL_NAMES,
	AcademicWizardObservationGuard,
	allowedAcademicModalNames,
	canonicalAcademicModalStep,
	isAcademicModalTargetValid,
	resolvePeriodDefinitionModalTarget,
	snapshotAcademicMutationTarget,
	type AcademicModalCatalog,
} from '../../../../../src/routes/(app)/configuration/academic/lib/academic-modal-surface';

const modalCatalog: AcademicModalCatalog = {
	years: [{ id: 'year-1', status: 'draft' }],
	periods: [{ id: 'period-1', status: 'draft' }],
	periodDefinitions: [{ id: 'definition-1', academicYearId: 'year-1' }],
};

describe('academic route helpers', () => {
	it('returns an empty slice by default', () => {
		expect(emptyAcademicSlice()).toEqual({
			yearCount: 0,
		});
	});

	it('requires a resolvable target for every target-backed modal', () => {
		for (const modal of ACADEMIC_MODAL_NAMES.filter(modal => modal !== 'create')) {
			expect(isAcademicModalTargetValid(modal, null, modalCatalog)).toBe(false);
			expect(isAcademicModalTargetValid(modal, 'missing', modalCatalog)).toBe(false);
		}

		expect(isAcademicModalTargetValid('period-def-wizard', 'year-1', modalCatalog)).toBe(true);
		expect(isAcademicModalTargetValid('publish-year', 'year-1', modalCatalog)).toBe(true);
		expect(isAcademicModalTargetValid('publish-period', 'period-1', modalCatalog)).toBe(true);
		expect(isAcademicModalTargetValid('delete-period-def', 'definition-1', modalCatalog)).toBe(true);
		expect(isAcademicModalTargetValid('period-def', 'year-1', modalCatalog)).toBe(true);
		expect(isAcademicModalTargetValid('period-def', 'definition-1', modalCatalog)).toBe(true);

		expect(isAcademicModalTargetValid('period-def-wizard', 'period-1', modalCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('archive-year', 'definition-1', modalCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('publish-period', 'year-1', modalCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('delete-period-def', 'year-1', modalCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('period-def', 'period-1', modalCatalog)).toBe(false);
	});

	it('owns all academic modal keys but excludes structure mutations without permission', () => {
		expect(allowedAcademicModalNames(true)).toEqual(ACADEMIC_MODAL_NAMES);
		expect(allowedAcademicModalNames(false)).toEqual([
			'create',
			'archive-year',
			'publish-year',
			'publish-period',
		]);
	});

	it('requires publish and archive targets to satisfy the UI status rules', () => {
		const publishedCatalog: AcademicModalCatalog = {
			...modalCatalog,
			years: [{ id: 'year-1', status: 'published' }],
			periods: [{ id: 'period-1', status: 'published' }],
		};
		const blockedPublishCatalog: AcademicModalCatalog = {
			...modalCatalog,
			years: [
				{ id: 'year-1', status: 'draft' },
				{ id: 'year-2', status: 'published' },
			],
		};

		expect(isAcademicModalTargetValid('archive-year', 'year-1', modalCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('archive-year', 'year-1', publishedCatalog)).toBe(true);
		expect(isAcademicModalTargetValid('publish-year', 'year-1', publishedCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('publish-year', 'year-1', blockedPublishCatalog)).toBe(false);
		expect(isAcademicModalTargetValid('publish-period', 'period-1', publishedCatalog)).toBe(false);
	});

	it('distinguishes period-definition create owners from edit targets', () => {
		expect(resolvePeriodDefinitionModalTarget('year-1', modalCatalog)).toEqual({
			mode: 'create',
			academicYearId: 'year-1',
			periodDefinitionId: null,
		});
		expect(resolvePeriodDefinitionModalTarget('definition-1', modalCatalog)).toEqual({
			mode: 'edit',
			academicYearId: 'year-1',
			periodDefinitionId: 'definition-1',
		});
		expect(resolvePeriodDefinitionModalTarget('missing', modalCatalog)).toBeNull();
	});

	it('keeps advanced wizard steps after the first mounted observation', () => {
		expect(canonicalAcademicModalStep('period-def-wizard', 'tweak', {
			resetAdvancedWizardStep: false,
		})).toBe('tweak');
		expect(canonicalAcademicModalStep('period-def-wizard', 'preview', {
			resetAdvancedWizardStep: true,
		})).toBe('preset');
		expect(canonicalAcademicModalStep('period-def-wizard', 'unknown', {
			resetAdvancedWizardStep: false,
		})).toBe('preset');
		expect(canonicalAcademicModalStep('period-def', 'preview', {
			resetAdvancedWizardStep: false,
		})).toBeNull();
		expect(canonicalAcademicModalStep('publish-year', 'preset', {
			resetAdvancedWizardStep: false,
		})).toBeNull();
	});

	it('resets only the first observed step for each mounted wizard instance', () => {
		const observation = new AcademicWizardObservationGuard();

		expect(observation.observe(false)).toBe(false);
		expect(observation.observe(true)).toBe(true);
		expect(observation.observe(true)).toBe(false);
		expect(observation.observe(false)).toBe(false);
		expect(observation.observe(true)).toBe(true);
	});

	it('snapshots mutation identity before refreshed route data can change', () => {
		const target = { id: 'year-1', label: '2025–2026' };
		const snapshot = snapshotAcademicMutationTarget(target);

		target.id = 'year-2';
		target.label = 'Changed';

		expect(snapshot).toEqual({ id: 'year-1', label: '2025–2026' });
	});
});
