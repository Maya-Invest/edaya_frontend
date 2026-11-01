import type { SubjectCategoryOption } from '$lib/api/subject-categories-data';

export interface SubjectCategoriesPageSlice {
	categories: SubjectCategoryOption[];
}

export function emptySubjectCategoriesSlice(): SubjectCategoriesPageSlice {
	return {
		categories: [],
	};
}
