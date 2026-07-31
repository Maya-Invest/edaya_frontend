import type { SchoolRaw } from '$lib/api/school-data';
import type { School } from '$lib/types/school';

export interface SchoolPageSlice {
	school: School | null;
	raw: SchoolRaw | null;
}

export function emptySchoolSlice(): SchoolPageSlice {
	return {
		school: null,
		raw: null,
	};
}
