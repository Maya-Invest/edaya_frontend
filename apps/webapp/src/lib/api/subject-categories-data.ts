import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { schoolWideEntityList } from '$lib/api/entity-list-filters';

export interface SubjectCategoryOption {
	id: string;
	schoolId: string;
	name: string;
}

const SUBJECT_CATEGORY_SCOPE
	= 'Subject category catalog is school-wide configuration.';

export async function loadSubjectCategories(
	client: ReturnType<typeof getBrowserSchoolClient>,
	schoolId: string,
): Promise<SubjectCategoryOption[]> {
	const rows = await client.entities.subjectCategories.list({
		...schoolWideEntityList(SUBJECT_CATEGORY_SCOPE),
		schoolId,
	});
	return (rows ?? [])
		.map(row => ({
			id: row.id,
			schoolId: row.schoolId,
			name: row.name,
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

export function categoryNameById(categories: readonly SubjectCategoryOption[]): Record<string, string> {
	return Object.fromEntries(categories.map(category => [category.id, category.name]));
}

export function defaultSubjectCategoryId(categories: readonly SubjectCategoryOption[]): string {
	return categories.find(category => category.name === 'Scientifique')?.id
		?? categories[0]?.id
		?? '';
}
