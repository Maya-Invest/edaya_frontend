import { ClassGroupDeleteBlockedError, cleanupClassGroupDependencies } from '$lib/school/delete-class-group-cleanup';
import { expect, test } from 'bun:test';

test('custom class cleanup removes only class curriculum links and preserves shared subject matter', async () => {
	const deleted: string[] = [];
	const resource = (name: string, rows: unknown[] = []) => ({
		list: async () => rows,
		delete: async ({ id }: { id: string }) => { deleted.push(`${name}:${id}`); },
		batchDelete: async () => { throw new Error('Unexpected batch deletion'); },
	});
	const entities = Object.fromEntries(['enrollments', 'teacherAssignments', 'staffAssignments', 'resourceAssignments', 'schedules', 'lessonSessions', 'activitySessions', 'assessments', 'attendances', 'subjectMatters'].map(name => [name, resource(name)]));
	entities.classSubjects = resource('classSubjects', [{ id: 'custom' }]);
	entities.classSubjectMatters = resource('classSubjectMatters', [{ id: 'link', subjectMatterId: 'shared-matter' }]);
	const client = { entities } as unknown as Parameters<typeof cleanupClassGroupDependencies>[0];
	await cleanupClassGroupDependencies(client, 'class');
	expect(deleted).toEqual(['classSubjectMatters:link', 'classSubjects:custom']);
});

test('enrollment history blocks class cleanup before any other operation', async () => {
	const calls: string[] = [];
	const client = { entities: {
		enrollments: { list: async () => {
			calls.push('enrollments.list');
			return [{ id: 'historical', status: 'inactive' }];
		} },
	} } as unknown as Parameters<typeof cleanupClassGroupDependencies>[0];
	await expect(cleanupClassGroupDependencies(client, 'class')).rejects.toBeInstanceOf(ClassGroupDeleteBlockedError);
	expect(calls).toEqual(['enrollments.list']);
});

test('inherited curriculum blocks class cleanup before any destructive operation', async () => {
	const calls: string[] = [];
	const client = { entities: {
		enrollments: { list: async () => {
			calls.push('enrollments.list');
			return [];
		} },
		classSubjects: { list: async () => {
			calls.push('classSubjects.list');
			return [{ id: 'inherited', gradeLevelSubjectId: 'grade-subject' }];
		} },
	} } as unknown as Parameters<typeof cleanupClassGroupDependencies>[0];
	await expect(cleanupClassGroupDependencies(client, 'class')).rejects.toBeInstanceOf(ClassGroupDeleteBlockedError);
	expect(calls).toEqual(['enrollments.list', 'classSubjects.list']);
});
