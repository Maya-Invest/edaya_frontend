import {
	createSubjectForGradeLevel,
	createSubjectImportIdsForGradeLevel,
} from '$lib/subjects/create-subject-for-grade-level';

import { createRecordingSchoolClient } from '$tests/support/recording-school-client';
import { describe, expect, it } from 'bun:test';

describe('createSubjectForGradeLevel', () => {
	it('builds stable ids for each class in the grade level', () => {
		const ids = createSubjectImportIdsForGradeLevel(0, 'gl-6', ['class-6a', 'class-6b'], 'seed');
		expect(ids.subjectId).toMatch(/^subj-seed-0$/);
		expect(ids.classSubjectIdsByClassGroupId).toEqual({
			'class-6a': 'cs-class-6a-seed-0',
			'class-6b': 'cs-class-6b-seed-0',
		});
	});

	it('saves the subject and mirrors in one command', async () => {
		const { client, requests } = createRecordingSchoolClient([{ id: 'subj-1' }]);

		const { classSubjectIds } = await createSubjectForGradeLevel(client, {
			schoolId: 'school-1',
			academicYearId: 'ay-1',
			gradeLevelId: 'gl-6',
			subjectId: 'subj-1',
			classSubjectIdsByClassGroupId: { 'class-6a': 'cs-1' },
			name: 'Mathématiques',
			isOptional: true,
			categoryId: 'cat-scientifique',
			color: 'mint',
		});

		expect(requests).toHaveLength(1);
		expect(requests[0]).toMatchObject({ path: '/core/commands/configure-subject', body: { isOptional: true } });
		expect(classSubjectIds).toEqual(['cs-1']);
	});
});
