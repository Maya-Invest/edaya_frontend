import { describe, expect, it } from 'bun:test';
import { createEmptyDraft } from '$lib/onboarding/draft-storage';
import { buildProvisionPayload } from '$lib/onboarding/provision-payload';
import { mergeOnboardingDraftWithServerStatus } from '$lib/onboarding/resume-onboarding';

describe('buildProvisionPayload', () => {
	it('maps draft school structure and filters empty class levels', () => {
		const draft = createEmptyDraft();
		draft.school.name = 'Lycée Demo';
		draft.school.city = 'Abidjan';
		draft.school.country = 'CI';
		draft.structure.models = ['college', 'lycee'];
		draft.structure.levels = [
			{ gradeLevelId: 'ci-college:6EME', classCount: 2, capacity: 40 },
			{ gradeLevelId: 'ci-lycee:1ERA', classCount: 0, capacity: 35 },
			{ gradeLevelId: 'ci-lycee:TLEA', classCount: 1, capacity: 30 },
		];
		draft.staffInvites = [
			{ id: '1', email: 'a@example.com', role: 'secretary' },
			{ id: '2', email: '  ', role: 'cpe' },
		];

		const payload = buildProvisionPayload(draft);
		expect(payload.school.name).toBe('Lycée Demo');
		expect(payload.structure.templates).toEqual(['ci-college', 'ci-lycee']);
		expect(payload.structure.levels).toEqual([
			{ gradeLevelId: 'ci-college:6EME', classCount: 2, capacity: 40 },
			{ gradeLevelId: 'ci-lycee:TLEA', classCount: 1, capacity: 30 },
		]);
		expect(payload.invites).toEqual([{ email: 'a@example.com', role: 'secretary' }]);
	});

	it('omits invites when none are active', () => {
		const draft = createEmptyDraft();
		draft.structure.models = ['college'];
		draft.structure.levels = [{ gradeLevelId: 'ci-college:6EME', classCount: 1, capacity: 30 }];
		const payload = buildProvisionPayload(draft);
		expect(payload.invites).toBeUndefined();
	});
});

describe('mergeOnboardingDraftWithServerStatus', () => {
	it('does not lower draft progress when server status is empty', () => {
		const draft = createEmptyDraft();
		draft.maxReachedStep = 3;
		draft.schoolStepSubmitted = true;
		draft.structureStepSubmitted = true;
		draft.school.name = 'Filled School';

		const merged = mergeOnboardingDraftWithServerStatus(draft, {
			wizardCompleted: false,
			maxReachedStep: 1,
			schoolStepSubmitted: false,
			structureStepSubmitted: false,
		});

		expect(merged.maxReachedStep).toBe(3);
		expect(merged.schoolStepSubmitted).toBe(true);
		expect(merged.structureStepSubmitted).toBe(true);
		expect(merged.school.name).toBe('Filled School');
	});

	it('raises draft progress from server when mid-migration commits exist', () => {
		const draft = createEmptyDraft();
		draft.maxReachedStep = 2;
		const merged = mergeOnboardingDraftWithServerStatus(
			draft,
			{
				wizardCompleted: false,
				maxReachedStep: 3,
				schoolStepSubmitted: true,
				structureStepSubmitted: true,
			},
			'sch-1',
		);
		expect(merged.maxReachedStep).toBe(3);
		expect(merged.schoolStepSubmitted).toBe(true);
		expect(merged.structureStepSubmitted).toBe(true);
		expect(merged.registeredSchoolId).toBe('sch-1');
	});
});
