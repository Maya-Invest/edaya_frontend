import { describe, expect, it } from 'bun:test';
import type { Activity } from '$lib/types/school';
import {
	cycleActivityListSort,
	filterActivityList,
} from '../../../../../src/routes/(app)/school/activities/lib/activity-list-filters';

function activity(id: string, overrides: Partial<Activity> = {}): Activity {
	return {
		id,
		name: `Activity ${id}`,
		category: 'Sport',
		coach: 'Coach',
		schedule: '—',
		participants: 0,
		capacity: 20,
		description: '',
		startDate: '2025-09-01',
		endDate: '2026-06-01',
		enrollments: [],
		classEnrollments: [],
		...overrides,
	};
}

const defaultFilters = {
	q: '',
	category: 'all',
	sort: 'roster' as const,
	sortDir: 'asc' as const,
};

describe('activity list filters', () => {
	it('filters activities by search and category', () => {
		const rows = [
			activity('1', { name: 'Chess club', category: 'Wellbeing' }),
			activity('2', { name: 'Theatre', category: 'Arts' }),
		];
		expect(filterActivityList(rows, { ...defaultFilters, q: 'chess' })).toHaveLength(1);
		expect(filterActivityList(rows, { ...defaultFilters, category: 'Arts' })).toHaveLength(1);
	});

	it('sorts activities by name and enrolled count', () => {
		const rows = [
			activity('1', { name: 'Charlie', enrollments: [{ id: 'e1', studentId: 's1', status: 'approved' }] }),
			activity('2', { name: 'Ada', enrollments: [] }),
		];
		expect(
			filterActivityList(rows, { ...defaultFilters, sort: 'name', sortDir: 'asc' }).map(entry => entry.id),
		).toEqual(['2', '1']);
		expect(
			filterActivityList(rows, { ...defaultFilters, sort: 'enrolled', sortDir: 'desc' }).map(entry => entry.id),
		).toEqual(['1', '2']);
	});

	it('cycles sort through asc, desc, and roster', () => {
		expect(cycleActivityListSort(defaultFilters, 'name')).toEqual({ sort: 'name', sortDir: 'asc' });
		expect(cycleActivityListSort({ sort: 'name', sortDir: 'asc' }, 'name')).toEqual({ sort: 'name', sortDir: 'desc' });
		expect(cycleActivityListSort({ sort: 'name', sortDir: 'desc' }, 'name')).toEqual({ sort: 'roster', sortDir: 'asc' });
	});
});
