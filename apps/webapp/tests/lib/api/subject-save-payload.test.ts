import { buildSubjectSavePayload } from '$lib/api/subject-save-payload';
import { describe, expect, it } from 'bun:test';

describe('buildSubjectSavePayload', () => {
	it('omits omitted short name and non-positive coefficient', () => {
		const payload = buildSubjectSavePayload(
			{
				id: 'subj-golf',
				schoolId: 'school-1', gradeLevelId: 'grade-6', academicYearId: 'year-1', isOptional: false, reportOrder: 0,
				name: 'GOLF',
				coefficient: 0,
				categoryId: 'school-1:subject-category:scientifique',
				color: 'mint',
			},
			{ name: 'GOLF', categoryId: 'school-1:subject-category:scientifique', color: 'warm' },
		);

		expect(payload).toEqual({
			id: 'subj-golf',
			schoolId: 'school-1', gradeLevelId: 'grade-6', academicYearId: 'year-1', isOptional: false, reportOrder: 0,
			name: 'GOLF',
			categoryId: 'school-1:subject-category:scientifique',
			color: 'warm',
		});
	});

	it('keeps short name and coefficient', () => {
		const payload = buildSubjectSavePayload(
			{
				id: 'subj-math',
				schoolId: 'school-1', gradeLevelId: 'grade-6', academicYearId: 'year-1', isOptional: false, reportOrder: 0,
				name: 'Mathematics',
				shortName: 'MATH',
				coefficient: 3,
				categoryId: 'school-1:subject-category:scientifique',
				color: 'mint',
				createdAt: '2024-01-01T00:00:00.000Z',
			},
			{ name: 'Maths', categoryId: 'school-1:subject-category:scientifique', color: 'sky' },
		);

		expect(payload).toMatchObject({
			shortName: 'MATH',
			coefficient: 3,
			color: 'sky',
			name: 'Maths',
		});
	});
});
