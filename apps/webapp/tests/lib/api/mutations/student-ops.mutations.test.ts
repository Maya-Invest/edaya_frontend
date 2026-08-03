import { beforeEach, describe, expect, it, mock } from 'bun:test';

const upsertStudentHealthProfile = mock(async (payload: Record<string, unknown>) => ({
	id: payload.id,
	studentId: payload.studentId,
	bloodType: payload.bloodType ?? null,
	allergies: payload.allergies ?? null,
	medicalConditions: payload.medicalConditions ?? null,
	medications: payload.medications ?? null,
	clinicalNotes: payload.clinicalNotes ?? null,
	lastVisit: payload.lastVisit ?? null,
}));

mock.module('$lib/toast.svelte', () => ({
	toast: { success: () => { }, error: () => { } },
}));

mock.module('$lib/auth/bootstrap-app', () => ({
	bootstrapAppShell: async () => { },
	resetAppShellBootstrap: () => { },
}));

mock.module('$lib/entity-versions.svelte', () => ({
	entityVersions: { bump: () => { } },
}));

mock.module('$lib/auth/session.svelte', () => ({
	authSession: { schoolId: 'school-1' },
}));

mock.module('$lib/api/school-client', () => ({
	getBrowserSchoolClient: () => ({
		commands: { upsertStudentHealthProfile },
	}),
}));

const { upsertStudentHealthProfileMutation } = await import('$lib/api/mutations/student-ops.mutations');

describe('upsertStudentHealthProfileMutation', () => {
	beforeEach(() => {
		upsertStudentHealthProfile.mockClear();
	});

	it('omits createdAt/updatedAt and normalizes lastVisit to ISO', async () => {
		const result = await upsertStudentHealthProfileMutation({
			id: 'shp-s1',
			studentId: 's1',
			bloodType: 'A+',
			allergies: 'Pollen',
			medicalConditions: 'Asthme',
			medications: 'Ventoline',
			clinicalNotes: 'Note',
			lastVisit: '2026-02-14',
			successMessage: 'saved',
		});

		expect(result).toMatchObject({ id: 'shp-s1', studentId: 's1', bloodType: 'A+' });
		expect(upsertStudentHealthProfile).toHaveBeenCalledTimes(1);
		const payload = upsertStudentHealthProfile.mock.calls[0]?.[0] as Record<string, unknown>;
		expect(payload).toMatchObject({
			id: 'shp-s1',
			studentId: 's1',
			bloodType: 'A+',
			allergies: 'Pollen',
			medicalConditions: 'Asthme',
			medications: 'Ventoline',
			clinicalNotes: 'Note',
		});
		expect(payload).not.toHaveProperty('updatedAt');
		expect(payload).not.toHaveProperty('createdAt');
		expect(typeof payload.lastVisit).toBe('string');
		expect(payload.lastVisit).toMatch(/^2026-02-14T/);
	});

	it('sends null lastVisit when the date is invalid or empty', async () => {
		await upsertStudentHealthProfileMutation({
			studentId: 's2',
			lastVisit: 'not-a-date',
		});
		expect(upsertStudentHealthProfile.mock.calls[0]?.[0]).toMatchObject({
			id: 'shp-s2',
			lastVisit: null,
		});

		upsertStudentHealthProfile.mockClear();
		await upsertStudentHealthProfileMutation({
			studentId: 's2',
			lastVisit: null,
		});
		expect(upsertStudentHealthProfile.mock.calls[0]?.[0]).toMatchObject({
			lastVisit: null,
		});
	});
});
