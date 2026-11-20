import { defineUrlFilterCodec } from '$lib/list/url-filter-codec';

const teacherAssignmentsListFiltersCodec = defineUrlFilterCodec({
	q: { type: 'search', default: '' },
	class: { type: 'string', default: 'all' },
	teacher: { type: 'string', default: 'all' },
});

export type TeacherAssignmentsListFilters = ReturnType<
  typeof teacherAssignmentsListFiltersCodec.read
>;

export function readTeacherAssignmentsListFilters(url: URL): TeacherAssignmentsListFilters {
	return teacherAssignmentsListFiltersCodec.read(url);
}

export function writeTeacherAssignmentsListFilters(
	url: URL,
	filters: TeacherAssignmentsListFilters,
): string {
	return teacherAssignmentsListFiltersCodec.write(url, filters);
}
