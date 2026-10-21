import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { updateSubject } from '$lib/subjects/update-subject';
import { describe, expect, it, mock } from 'bun:test';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

describe('combined subject edit', () => {
	it('uses one grade-level command for catalog metadata and workload, without a class lookup', async () => {
		const updateSubjectCommand = mock(async (_input: Parameters<SchoolClient['commands']['updateSubject']>[0]) => ({ id: 'gls-6-math' }));
		const getClassSubject = mock(async () => {
			throw new Error('A catalog id is not a class-subject id');
		});
		const client = { commands: { updateSubject: updateSubjectCommand }, entities: { classSubjects: { get: getClassSubject } } } as unknown as SchoolClient;
		await updateSubject(client, {
			classSubjectId: 'gls-6-math',
			subjectId: 'gls-6-math',
			name: 'Maths',
			categoryId: 'cat-science',
			color: 'sky',
			periodsPerWeek: 5,
			minPeriodSpan: null,
			maxPeriodSpan: 2,
		});
		expect(getClassSubject).not.toHaveBeenCalled();
		expect(updateSubjectCommand).toHaveBeenCalledTimes(1);
		expect(updateSubjectCommand.mock.calls[0]).toEqual([{
			subjectId: 'gls-6-math',
			name: 'Maths',
			categoryId: 'cat-science',
			color: 'sky',
			periodsPerWeek: 5,
			minPeriodSpan: null,
			maxPeriodSpan: 2,
		}]);
	});

	it('keeps class-subject metadata edits and existing catalog fields', async () => {
		const updateSubjectCommand = mock(async (_input: Parameters<SchoolClient['commands']['updateSubject']>[0]) => ({ id: 'subj-math' }));
		const client = {
			commands: { updateSubject: updateSubjectCommand },
			entities: {
				classSubjects: { get: async () => ({ subjectId: 'subj-math' }) },
				subjects: { get: async () => ({ id: 'subj-math', code: 'MATH', shortName: 'Mt', coefficient: 2 }) },
			},
		} as unknown as SchoolClient;
		await updateSubject(client, { classSubjectId: 'cs-6a-math', name: 'Maths', categoryId: 'cat-science', color: 'mint' });
		expect(updateSubjectCommand.mock.calls[0]).toEqual([{
			subjectId: 'subj-math',
			name: 'Maths',
			categoryId: 'cat-science',
			color: 'mint',
			periodsPerWeek: undefined,
			minPeriodSpan: undefined,
			maxPeriodSpan: undefined,
		}]);
	});
});
