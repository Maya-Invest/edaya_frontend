import type { PlanningEvent } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';
import { mergeById, seedPlanningCollection } from '$lib/detail-data/seed-policies';

function planningEvent(id: string, classId: string): PlanningEvent {
	return {
		id,
		classId,
		kind: 'lesson',
		title: `Event ${id}`,
		subject: 'Math',
		day: 'Mon',
		start: '08:00',
		end: '09:00',
		startsAt: '2026-01-05T08:00:00.000Z',
		endsAt: '2026-01-05T09:00:00.000Z',
		room: 'A1',
		teacher: 'Teacher',
	};
}

interface IdentifiedRow {
	id: string;
	label: string;
}

describe('entity store action helpers', () => {
	it('mergeById upserts rows by id', () => {
		const rows: IdentifiedRow[] = [
			{ id: 'spa-1', label: '6ème A' },
			{ id: 'spa-2', label: 'School-wide' },
		];

		const merged = mergeById(rows, [{ id: 'spa-1', label: '6ème B' }, { id: 'spa-3', label: 'Finance' }]);

		expect(merged.map(row => row.id).sort()).toEqual(['spa-1', 'spa-2', 'spa-3']);
		expect(merged.find(row => row.id === 'spa-1')?.label).toBe('6ème B');
	});

	it('mergeById removes rows when filtered after upsert', () => {
		const rows = mergeById(
			[{ id: 'spa-1', label: 'A' }, { id: 'spa-2', label: 'B' }],
			[{ id: 'spa-1', label: 'A updated' }],
		);

		const remaining = rows.filter(row => row.id !== 'spa-1');
		expect(remaining.map(row => row.id)).toEqual(['spa-2']);
	});

	it('replaces planning events for a class scope when seeding', () => {
		let planning = seedPlanningCollection([], [planningEvent('p1', '6a'), planningEvent('p2', '6b')], { classId: '6a' });
		planning = seedPlanningCollection(planning, [planningEvent('p3', '6a')], { classId: '6a' });

		expect(planning.filter(event => event.classId === '6a').map(event => event.id)).toEqual(['p3']);
		expect(planning.filter(event => event.classId === '6b').map(event => event.id)).toEqual(['p2']);
	});
});
