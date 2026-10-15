import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { describe, expect, it, mock } from 'bun:test';
import { updateSubject } from '$lib/subjects/update-subject';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

describe('combined subject edit', () => {
	it('uses one grade-level command for catalog metadata and workload, without a class lookup', async () => {
		const updateGradeLevelSubject = mock(async (_input: Parameters<SchoolClient['commands']['updateGradeLevelSubject']>[0]) => ({ id: 'gls-6-math' }));
		const getClassSubject = mock(async () => { throw new Error('A catalog id is not a class-subject id'); });
		const client = { commands: { updateGradeLevelSubject }, entities: { classSubjects: { get: getClassSubject } } } as unknown as SchoolClient;
		await updateSubject(client, {
			classSubjectId: 'gls-6-math', gradeLevelSubjectId: 'gls-6-math',
			name: 'Maths', categoryId: 'cat-science', color: 'sky',
			periodsPerWeek: 5, minPeriodSpan: null, maxPeriodSpan: 2,
		});
		expect(getClassSubject).not.toHaveBeenCalled();
		expect(updateGradeLevelSubject).toHaveBeenCalledTimes(1);
		expect(updateGradeLevelSubject.mock.calls[0]).toEqual([{
			gradeLevelSubjectId: 'gls-6-math', name: 'Maths', categoryId: 'cat-science', color: 'sky',
			periodsPerWeek: 5, minPeriodSpan: null, maxPeriodSpan: 2,
		}]);
	});

	it('keeps class-subject metadata edits and existing catalog fields', async () => {
		const configureSubject = mock(async (_input: Parameters<SchoolClient['commands']['configureSubject']>[0]) => ({ id: 'subj-math' }));
		const client = {
			commands: { configureSubject },
			entities: {
				classSubjects: { get: async () => ({ subjectId: 'subj-math' }) },
				subjects: { get: async () => ({ id: 'subj-math', code: 'MATH', shortName: 'Mt', defaultCoefficient: 2 }) },
			},
		} as unknown as SchoolClient;
		await updateSubject(client, { classSubjectId: 'cs-6a-math', name: 'Maths', categoryId: 'cat-science', color: 'mint' });
		expect(configureSubject.mock.calls[0]).toEqual([{
			id: 'subj-math', name: 'Maths', categoryId: 'cat-science', color: 'mint', code: 'MATH', shortName: 'Mt', defaultCoefficient: 2,
		}]);
	});
});
