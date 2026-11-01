import { defineUrlFilterCodec } from '$lib/list/url-filter-codec';

const gradeLevelsListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	cycle: { type: 'string', default: 'all' },
});

export type GradeLevelsListFilters = ReturnType<typeof gradeLevelsListFiltersCodec.read>;

export function readGradeLevelsListFilters(url: URL): GradeLevelsListFilters {
	return gradeLevelsListFiltersCodec.read(url);
}

export function writeGradeLevelsListFilters(url: URL, filters: GradeLevelsListFilters): string {
	return gradeLevelsListFiltersCodec.write(url, filters);
}
