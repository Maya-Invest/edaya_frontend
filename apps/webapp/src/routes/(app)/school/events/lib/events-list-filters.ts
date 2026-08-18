import { defineUrlFilterCodec } from '$lib/list/url-filter-codec';

const eventsListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	class: { type: 'string', default: 'all' },
	category: { type: 'string', default: 'all' },
	severity: { type: 'string', default: 'all' },
	status: { type: 'string', default: 'all' },
});

export type EventsListFilters = ReturnType<typeof eventsListFiltersCodec.read>;

export function readEventsListFilters(url: URL): EventsListFilters {
	return eventsListFiltersCodec.read(url);
}

export function writeEventsListFilters(url: URL, filters: EventsListFilters): string {
	return eventsListFiltersCodec.write(url, filters);
}
