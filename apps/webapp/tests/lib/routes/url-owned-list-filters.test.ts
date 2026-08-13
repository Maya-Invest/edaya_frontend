import { describe, expect, it } from 'bun:test';
import {
	readClassGroupsListFilters,
	writeClassGroupsListFilters,
} from '../../../src/routes/(app)/configuration/classes/lib/class-groups-list-filters';
import {
	readGradeLevelsListFilters,
	writeGradeLevelsListFilters,
} from '../../../src/routes/(app)/configuration/grade-levels/lib/grade-levels-list-filters';
import {
	readTeacherAssignmentsListFilters,
	writeTeacherAssignmentsListFilters,
} from '../../../src/routes/(app)/configuration/tools/teacher-assignments/lib/teacher-assignments-list-filters';
import {
	readEventsListFilters,
	writeEventsListFilters,
} from '../../../src/routes/(app)/school/events/lib/events-list-filters';

function url(path: string): URL {
	return new URL(path, 'https://school.test');
}

describe('route-local URL list filters', () => {
	it('round-trips event search and facets while preserving modal state', () => {
		const href = writeEventsListFilters(url('/school/events?modal=create'), {
			q: '  tardy  ',
			class: 'class-6a',
			category: 'Tardiness',
			severity: 'medium',
			status: 'open',
		});

		expect(href).toContain('modal=create');
		expect(readEventsListFilters(url(href))).toEqual({
			q: 'tardy',
			class: 'class-6a',
			category: 'Tardiness',
			severity: 'medium',
			status: 'open',
		});
	});

	it('round-trips grade-level search and cycle', () => {
		const href = writeGradeLevelsListFilters(url('/configuration/grade-levels'), {
			q: 'sixième',
			cycle: 'Collège',
		});

		expect(readGradeLevelsListFilters(url(href))).toEqual({
			q: 'sixième',
			cycle: 'Collège',
		});
	});

	it('round-trips class-group search and grade-level facet', () => {
		const href = writeClassGroupsListFilters(url('/configuration/classes'), {
			q: '6e',
			gradeLevel: 'gl-6',
		});

		expect(readClassGroupsListFilters(url(href))).toEqual({
			q: '6e',
			gradeLevel: 'gl-6',
		});
	});

	it('round-trips teacher-assignment hub filters', () => {
		const href = writeTeacherAssignmentsListFilters(
			url('/configuration/tools/teacher-assignments'),
			{
				q: 'algebra',
				class: 'class-6a',
				teacher: 'teacher-1',
			},
		);

		expect(readTeacherAssignmentsListFilters(url(href))).toEqual({
			q: 'algebra',
			class: 'class-6a',
			teacher: 'teacher-1',
		});
	});
});
