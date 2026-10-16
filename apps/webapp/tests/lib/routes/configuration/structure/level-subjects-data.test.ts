import { describe, expect, it } from 'bun:test';
import { createRecordingSchoolClient, entityListRequests } from '$tests/support/recording-school-client';
import { loadLevelSubjects } from '../../../../../src/routes/(app)/configuration/structure/subjects/lib/level-subjects-data';

const scope = { schoolId: 'school-1', levelId: 'level-6', academicYearId: 'year-1' };
const envelope = (rows: unknown[]) => rows.map(data => ({ data }));
describe('level subject loading', () => {
	it('loads only the selected level/year and its linked chapters, without requiring classes', async () => {
		const { client, requests } = createRecordingSchoolClient([
			envelope([{ id: 'gls-1', gradeLevelId: scope.levelId, academicYearId: scope.academicYearId, subjectId: 'subject-1', periodsPerWeek: 4 }]),
			envelope([{ id: 'subject-1', schoolId: scope.schoolId, name: 'Math', categoryId: 'category-1', color: 'sky' }]),
			envelope([{ id: 'link-1', gradeLevelSubjectId: 'gls-1', subjectMatterId: 'chapter-1' }]),
			envelope([{ id: 'category-1', schoolId: scope.schoolId, name: 'Science' }]),
			envelope([{ id: 'chapter-1', subjectId: 'subject-1', name: 'Numbers', sequenceOrder: 1 }]),
		]);
		const result = await loadLevelSubjects(client, scope);
		expect(result.subjects).toHaveLength(1);
		expect(result.subjects[0]).toMatchObject({ id: 'gls-1', gradeLevelId: scope.levelId, periodsPerWeek: 4, catalogChapters: [{ id: 'chapter-1', name: 'Numbers' }] });
		expect(entityListRequests(requests, 'grade-level-subjects')[0]?.body).toMatchObject({ gradeLevelId: scope.levelId, academicYearId: scope.academicYearId });
		expect(entityListRequests(requests, 'subject-matters')[0]?.body).toMatchObject({ id: { $in: ['chapter-1'] } });
		expect(entityListRequests(requests, 'class-groups')).toHaveLength(0);
		expect(entityListRequests(requests, 'class-subjects')).toHaveLength(0);
	});
	it('keeps an empty level/year empty instead of rebuilding it from another year or class', async () => {
		const { client, requests } = createRecordingSchoolClient([[], []]);
		expect(await loadLevelSubjects(client, scope)).toEqual({ subjects: [], logEntries: [] });
		expect(entityListRequests(requests, 'subjects')).toHaveLength(0);
		expect(entityListRequests(requests, 'class-subjects')).toHaveLength(0);
	});
});
