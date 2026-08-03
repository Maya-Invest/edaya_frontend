import { describe, expect, it } from 'bun:test';
import { createEmptyDraft } from '$lib/onboarding/draft-storage';
import { buildProvisionPayload } from '$lib/onboarding/provision-payload';

describe('buildProvisionPayload', () => {
	it('maps draft school structure and filters empty class levels', () => {
		const draft = createEmptyDraft();
		draft.school.name = 'Lycée Demo';
		draft.school.city = 'Abidjan';
		draft.school.country = 'CI';
		draft.structure.models = ['college', 'lycee'];
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

	it('omits invites when none are active', () => {
		const draft = createEmptyDraft();
		draft.structure.models = ['college'];
		draft.structure.levels = [{ gradeLevelId: 'ci-college:6EME', classCount: 1, capacity: 30, classNamingMode: 'numerical' }];
		const payload = buildProvisionPayload(draft);
		expect(payload.invites).toBeUndefined();
	});
});
