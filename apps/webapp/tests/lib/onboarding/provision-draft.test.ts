import { describe, expect, it } from 'bun:test';
import { createDatasetDraft as createEmptyDraft } from './dataset-fixture';
import { buildProvisionPayload, restoreProvisionedDraft } from '$lib/onboarding/provision-payload';
import { academicYearLabelFromDates } from '$lib/onboarding/school-step-defaults';

describe('buildProvisionPayload', () => {
	it('maps draft school structure and filters empty class levels', () => {
		const draft = createEmptyDraft();
		draft.school.name = 'Lycée Demo';
		draft.school.city = 'Abidjan';
		draft.school.financeCurrency = 'EUR';
		draft.school.country = 'CI';
		draft.structure.templates = ['ci-college', 'ci-lycee'];
		draft.structure.levels = [
			{ gradeLevelId: 'ci-college:6EME', classCount: 2, capacity: 40, classNamingMode: 'numerical' },
			{ gradeLevelId: 'ci-lycee:1ERA', classCount: 0, capacity: 35, classNamingMode: 'numerical' },
			{ gradeLevelId: 'ci-lycee:TLEA', classCount: 1, capacity: 30, classNamingMode: 'alphabetical' },
		];
		draft.staffInvites = [
			{ id: '1', email: 'a@example.com', role: 'secretary' },
			{ id: '2', email: '  ', role: 'cpe' },
		];

		const payload = buildProvisionPayload(draft);
		expect(payload.school.name).toBe('Lycée Demo');
		expect(payload.structure.templates).toEqual(['ci-college', 'ci-lycee']);
		expect(payload.structure.levels).toEqual([
			{ gradeLevelId: 'ci-college:6EME', classCount: 2, capacity: 40, classNamingMode: 'numerical' },
			{ gradeLevelId: 'ci-lycee:TLEA', classCount: 1, capacity: 30, classNamingMode: 'alphabetical' },
		]);
		expect(payload.invites).toEqual([{ email: 'a@example.com', role: 'secretary' }]);
	});

	it('omits incomplete or invalid staff invites so provision is not rejected with 422', () => {
		const draft = createEmptyDraft();
		draft.structure.templates = ['ci-college'];
		draft.structure.levels = [{ gradeLevelId: 'ci-college:6EME', classCount: 1, capacity: 30, classNamingMode: 'numerical' }];
		draft.staffInvites = [
			{ id: '1', email: 'not-an-email', role: 'secretary' },
			{ id: '2', email: 'ok@school.fr', role: 'cpe' },
		];
		expect(buildProvisionPayload(draft).invites).toEqual([{ email: 'ok@school.fr', role: 'cpe' }]);
	});

	it('omits invites when none are active', () => {
		const draft = createEmptyDraft();
		draft.structure.templates = ['ci-college'];
		draft.structure.levels = [{ gradeLevelId: 'ci-college:6EME', classCount: 1, capacity: 30, classNamingMode: 'numerical' }];
		const payload = buildProvisionPayload(draft);
		expect(payload.invites).toBeUndefined();
	});

	it('derives the academic year label from school dates', () => {
		const draft = createEmptyDraft();
		draft.school.academicYearLabel = 'anneeteny';
		draft.school.academicYearStart = '2026-09-01';
		draft.school.academicYearEnd = '2027-07-03';
		const payload = buildProvisionPayload(draft);
		expect(payload.school.academicYearLabel).toBe(
			academicYearLabelFromDates('2026-09-01', '2027-07-03'),
		);
		expect(payload.school.academicYearLabel).toBe('2026-2027');
	});
});

it('submits only the pinned dataset reference and school-specific configuration', () => {
 const draft = createEmptyDraft();
 const payload = buildProvisionPayload(draft);
 expect(payload.structure.dataset).toEqual({id: 'ci-general-secondary', version: '1.0.0'});
 expect(Object.keys(payload.structure).sort()).toEqual(['dataset', 'levels', 'templates']);
 draft.structure.dataset = null;
 expect(() => buildProvisionPayload(draft)).toThrow('ONBOARDING_DATASET_REQUIRED');
});


it('restores the committed request after a lost response, including removed invitations', () => {
 const draft = createEmptyDraft();
 draft.school.name = 'Original school';
 const original = buildProvisionPayload(draft);
 draft.school.name = 'Edited after timeout';
 draft.staffInvites = [{id: 'late', email: 'late@example.com', role: 'secretary'}];
 draft.structure.dataset = {id: 'another', version: '2.0.0'};
 restoreProvisionedDraft(draft, original);
 expect(buildProvisionPayload(draft)).toEqual(original);
 expect(draft.staffInvites).toEqual([]);
});
