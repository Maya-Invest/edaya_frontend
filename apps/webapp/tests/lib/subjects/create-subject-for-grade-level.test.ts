import { describe, expect, it } from 'bun:test';

import {
	createSubjectForGradeLevel,
	createSubjectImportIdsForGradeLevel,
} from '$lib/subjects/create-subject-for-grade-level';

describe('createSubjectForGradeLevel', () => {
	it('builds stable ids for each class in the grade level', () => {
		const ids = createSubjectImportIdsForGradeLevel(0, 'gl-6', ['class-6a', 'class-6b'], 'seed');
		expect(ids.subjectId).toMatch(/^subj-seed-0$/);
		expect(ids.gradeLevelSubjectId).toBe('gls-gl-6-seed-0');
		expect(ids.classSubjectIdsByClassGroupId).toEqual({
			'class-6a': 'cs-class-6a-seed-0',
			'class-6b': 'cs-class-6b-seed-0',
		});
	});

	it('calls configureSubject then offerSubjectToGradeLevel', async () => {
		const configureSubject = async () => ({});
		const offerSubjectToGradeLevel = async () => ({});
		const calls: string[] = [];
		const client = {
			commands: {
				configureSubject: async () => {
					calls.push('configureSubject');
				},
				offerSubjectToGradeLevel: async () => {
					calls.push('offerSubjectToGradeLevel');
				},
			},
		} as never;

		const { classSubjectIds } = await createSubjectForGradeLevel(client, {
			schoolId: 'school-1',
			academicYearId: 'ay-1',
			gradeLevelId: 'gl-6',
			subjectId: 'subj-1',
			gradeLevelSubjectId: 'gls-1',
			classSubjectIdsByClassGroupId: { 'class-6a': 'cs-1' },
			name: 'Mathématiques',
			categoryId: 'cat-scientifique',
			color: 'mint',
		});

		expect(calls).toEqual(['configureSubject', 'offerSubjectToGradeLevel']);
		expect(classSubjectIds).toEqual(['cs-1']);
	});
});
