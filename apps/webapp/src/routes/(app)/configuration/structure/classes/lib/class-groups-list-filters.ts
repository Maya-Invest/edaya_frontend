import { defineUrlFilterCodec } from '$lib/list/url-filter-codec';

const classGroupsListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	gradeLevel: { type: 'string', default: 'all' },
});

export type ClassGroupsListFilters = ReturnType<typeof classGroupsListFiltersCodec.read>;

export function readClassGroupsListFilters(url: URL): ClassGroupsListFilters {
	return classGroupsListFiltersCodec.read(url);
}

export function writeClassGroupsListFilters(url: URL, filters: ClassGroupsListFilters): string {
	return classGroupsListFiltersCodec.write(url, filters);
}
