import type { MutationOptions } from '../../src/lib/api/mutations/execute-mutation';
import { beforeEach, expect, mock, test } from 'bun:test';
import { executeMutation } from '../../src/lib/api/mutations/execute-mutation';

const saved = mock(async (record: unknown) => record);
const created = mock(async (record: unknown) => record);
const deleted = mock(async (_record: unknown) => ({ message: 'Deleted' }));
const current = { id: 'period', academicYearId: 'year', schoolId: 'school', name: 'Stored name', type: 'semester', isPublished: true, startDate: '2026-09-01', endDate: '2026-12-31T23:59:59Z', createdAt: '2026-01-01T00:00:00Z' };
const refreshed = mock(async () => {});
const errors: string[] = [];
const client = { commands: { createAcademicPeriod: created }, entities: {
	academicPeriods: { get: async () => current, save: saved, delete: deleted },
	academicYears: { get: async () => ({ ...current, id: 'year', status: 'published' }), save: saved, delete: deleted },
} };
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => client }));
mock.module('$lib/auth/session.svelte', () => ({ authSession: { schoolId: 'school' } }));
mock.module('$lib/academic/context.svelte', () => ({ academicContext: {} }));
mock.module('$lib/school/delete-class-group-cleanup', () => ({ cleanupClassGroupDependencies: async () => {} }));
mock.module('$lib/navigation/navigate-after-delete', () => ({ navigateToListAfterEntityDelete: () => {} }));
mock.module('$lib/api/mutations/run-mutation', () => ({
	refreshAppShellData: refreshed,
	runMutation: <T>(request: () => Promise<T>, options: Omit<MutationOptions<T>, 'request'>) => executeMutation({ request, ...options }, { bump: () => {}, success: () => {}, error: message => errors.push(message), translate: key => key }),
}));
const mutations = await import('../../src/lib/api/mutations/academic.mutations');
const fields = { name: 'Updated', startDate: '2026-09-02', endDate: '2026-12-30', type: 'semester' as const };

beforeEach(() => {
	saved.mockClear();
	created.mockClear();
	deleted.mockClear();
	refreshed.mockReset();
	refreshed.mockImplementation(async () => {});
	errors.length = 0;
});

test('updates current records while preserving publication, identity and creation metadata', async () => {
	expect(await mutations.updateAcademicPeriodMutation('period', fields)).toBe(true);
	expect(saved.mock.calls[0]?.[0]).toEqual({ ...current, ...fields });
	expect(await mutations.updateAcademicYearMutation('year', fields)).toBe(true);
	expect(saved.mock.calls[1]?.[0]).toMatchObject({ id: 'year', schoolId: 'school', status: 'published', createdAt: current.createdAt, name: fields.name, startDate: fields.startDate, endDate: fields.endDate });
});

test('name-only edits preserve the stored date representation', async () => {
	expect(await mutations.updateAcademicPeriodMutation('period', { ...fields, startDate: '2026-09-01', endDate: '2026-12-31' })).toBe(true);
	expect(saved.mock.calls[0]?.[0]).toMatchObject({ startDate: current.startDate, endDate: current.endDate });
});

test('creates draft periods for the targeted year and deletes only the targeted record', async () => {
	expect(await mutations.createAcademicPeriodMutation('other-year', fields)).toBe(true);
	expect(created.mock.calls[0]?.[0]).toMatchObject({ ...fields, schoolId: 'school', academicYearId: 'other-year', isPublished: false });
	expect(await mutations.deleteAcademicPeriodMutation('period')).toBe(true);
	expect(deleted.mock.calls[0]?.[0]).toEqual({ id: 'period' });
});

test('a refresh failure keeps a committed save successful and requests read retry without another write', async () => {
	refreshed.mockImplementation(async () => {
		throw new Error('Offline');
	});
	const failed = mock(() => {});
	expect(await mutations.updateAcademicPeriodMutation('period', fields, { onRefreshFailed: failed })).toBe(true);
	expect(saved).toHaveBeenCalledTimes(1);
	expect(failed).toHaveBeenCalledTimes(1);
	expect(errors).toEqual(['mutation.savedRefreshFailed']);
});

test('generated trimesters remain inside unusual year ranges and never overlap', () => {
	for (const [start, end] of [['2027-01-01', '2027-12-31'], ['2027-01-01', '2027-01-01'], ['2026-09-01', '2027-07-03']]) {
		const periods = mutations.trimestersForYear(start!, end!);
		expect(periods[0]?.startDate).toBe(start!);
		expect(periods.at(-1)?.endDate).toBe(end!);
		for (const [index, period] of periods.entries()) {
			expect(period.startDate <= period.endDate && period.startDate >= start! && period.endDate <= end!).toBe(true);
			if (index)
				expect(period.startDate > periods[index - 1]!.endDate).toBe(true);
		}
	}
});
