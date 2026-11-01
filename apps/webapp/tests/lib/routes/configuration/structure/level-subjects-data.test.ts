import { createRecordingSchoolClient, entityListRequests, queryRequests } from '$tests/support/recording-school-client';
import { describe, expect, it } from 'bun:test';
import { loadLevelSubjects } from '../../../../../src/routes/(app)/configuration/structure/subjects/lib/level-subjects-data';
const scope = { schoolId: 'school-1', levelId: 'level-6', academicYearId: 'year-1' };
const configuration = { gradeLevelId: scope.levelId, academicYearId: scope.academicYearId, settings: { academicYearId: scope.academicYearId, revision: 2 }, modules: [], subjects: [{ id: 'subject-1', schoolId: scope.schoolId, gradeLevelId: scope.levelId, academicYearId: scope.academicYearId, name: 'Math', categoryId: 'category-1', categoryName: 'Science', color: 'sky', periodsPerWeek: 4, reportOrder: 0 }] };
describe('level subject loading', () => {
 it('uses the scoped configuration read without requesting chapter or class access', async () => {
  const { client, requests } = createRecordingSchoolClient([configuration]);
  const result = await loadLevelSubjects(client, scope);
  expect(result.subjects[0]).toMatchObject({ id: 'subject-1', category: 'Science', periodsPerWeek: 4 });
  expect(queryRequests(requests, 'get-report-configuration')[0]?.body).toEqual({ gradeLevelId: scope.levelId, academicYearId: scope.academicYearId });
  expect(entityListRequests(requests, 'subject-matters')).toHaveLength(0);
  expect(entityListRequests(requests, 'class-subjects')).toHaveLength(0);
 });
 it('keeps an empty level/year empty', async () => {
  const empty = { ...configuration, subjects: [] };
  const { client, requests } = createRecordingSchoolClient([empty]);
  expect(await loadLevelSubjects(client, scope)).toEqual({ configuration: empty, subjects: [], logEntries: [] });
  expect(requests).toHaveLength(1);
 });
});
