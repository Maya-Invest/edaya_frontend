import type { PeriodGridModalCatalog } from '../../../../../src/routes/(app)/configuration/period-grid/lib/period-grid-modal-surface';
import { describe, expect, it } from 'bun:test';
import {
	PERIOD_GRID_MODAL_NAMES,
	PeriodGridWizardObservationGuard,
	allowedPeriodGridModalNames,
	canonicalPeriodGridModalStep,
	isPeriodGridModalTargetValid,
	resolvePeriodDefinitionModalTarget,
} from '../../../../../src/routes/(app)/configuration/period-grid/lib/period-grid-modal-surface';
import {
	readPeriodGridYear,
	writePeriodGridYear,
} from '../../../../../src/routes/(app)/configuration/period-grid/lib/period-grid-year';

const modalCatalog: PeriodGridModalCatalog = {
	years: [{ id: 'year-1' }],
	periodDefinitions: [{ id: 'definition-1', academicYearId: 'year-1' }],
};

describe('period grid route helpers', () => {
	it('requires a resolvable target for every modal', () => {
		for (const modal of PERIOD_GRID_MODAL_NAMES) {
			expect(isPeriodGridModalTargetValid(modal, null, modalCatalog)).toBe(false);
			expect(isPeriodGridModalTargetValid(modal, 'missing', modalCatalog)).toBe(false);
		}

		expect(isPeriodGridModalTargetValid('period-def-wizard', 'year-1', modalCatalog)).toBe(true);
		expect(isPeriodGridModalTargetValid('delete-period-def', 'definition-1', modalCatalog)).toBe(true);
		expect(isPeriodGridModalTargetValid('period-def', 'year-1', modalCatalog)).toBe(true);
		expect(isPeriodGridModalTargetValid('period-def', 'definition-1', modalCatalog)).toBe(true);
		expect(isPeriodGridModalTargetValid('period-def-wizard', 'definition-1', modalCatalog)).toBe(false);
		expect(isPeriodGridModalTargetValid('delete-period-def', 'year-1', modalCatalog)).toBe(false);
	});

	it('hides structure mutations without permission', () => {
		expect(allowedPeriodGridModalNames(true)).toEqual(PERIOD_GRID_MODAL_NAMES);
		expect(allowedPeriodGridModalNames(false)).toEqual([]);
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
		expect(canonicalPeriodGridModalStep('period-def-wizard', 'tweak', {
			resetAdvancedWizardStep: false,
		})).toBe('tweak');
		expect(canonicalPeriodGridModalStep('period-def-wizard', 'preview', {
			resetAdvancedWizardStep: true,
		})).toBe('preset');
		expect(canonicalPeriodGridModalStep('period-def-wizard', 'unknown', {
			resetAdvancedWizardStep: false,
		})).toBe('preset');
		expect(canonicalPeriodGridModalStep('period-def', 'preview', {
			resetAdvancedWizardStep: false,
		})).toBeNull();
	});

	it('resets only the first observed step for each mounted wizard instance', () => {
		const observation = new PeriodGridWizardObservationGuard();

		expect(observation.observe(false)).toBe(false);
		expect(observation.observe(true)).toBe(true);
		expect(observation.observe(true)).toBe(false);
		expect(observation.observe(false)).toBe(false);
		expect(observation.observe(true)).toBe(true);
	});

	it('keeps the selected year in the query string and falls back to a known year', () => {
		const allowed = ['year-1', 'year-2'];
		const url = new URL('http://localhost/configuration/period-grid?year=year-2');

		expect(readPeriodGridYear(url, allowed, 'year-1')).toBe('year-2');
		expect(readPeriodGridYear(new URL('http://localhost/configuration/period-grid?year=missing'), allowed, 'year-1'))
			.toBe('year-1');
		expect(readPeriodGridYear(new URL('http://localhost/configuration/period-grid'), allowed, null))
			.toBe('year-1');
		expect(writePeriodGridYear(url, 'year-1')).toBe('/configuration/period-grid?year=year-1');
	});
});
