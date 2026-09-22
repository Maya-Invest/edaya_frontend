import { describe, expect, it } from 'bun:test';
import { buildSubjectSavePayload } from '$lib/api/subject-save-payload';

describe('buildSubjectSavePayload', () => {
	it('omits blank code and non-positive defaultCoefficient', () => {
		const payload = buildSubjectSavePayload(
			{
				id: 'subj-golf',
				schoolId: 'school-1',
				name: 'GOLF',
				code: '',
				defaultCoefficient: 0,
				categoryId: 'school-1:subject-category:scientifique',
				color: 'mint',
			},
			{ name: 'GOLF', categoryId: 'school-1:subject-category:scientifique', color: 'warm' },
		);

		expect(payload).toEqual({
			id: 'subj-golf',
			schoolId: 'school-1',
			name: 'GOLF',
			categoryId: 'school-1:subject-category:scientifique',
			color: 'warm',
		});
	});

	it('keeps valid code and coefficient', () => {
		const payload = buildSubjectSavePayload(
			{
				id: 'subj-math',
				schoolId: 'school-1',
				name: 'Mathematics',
				code: 'MATH',
				defaultCoefficient: 3,
				categoryId: 'school-1:subject-category:scientifique',
				color: 'mint',
				createdAt: '2024-01-01T00:00:00.000Z',
			},
			{ name: 'Maths', categoryId: 'school-1:subject-category:scientifique', color: 'sky' },
		);

		expect(payload).toMatchObject({
			code: 'MATH',
			defaultCoefficient: 3,
			color: 'sky',
			name: 'Maths',
		});
	});
});
