import { describe, expect, it } from 'bun:test';
import type { CardFieldColumn } from '../../../src/lib/list/list-card-fields';
import { cardFieldShowsLabel, cardFieldsByZone } from '../../../src/lib/list/list-card-fields';
import type { ListEntityTableColumn } from '../../../src/lib/list/list-entity-table-types';

const columns: ListEntityTableColumn[] = [
	{ key: 'name', label: 'Name', span: 3, card: { zone: 'header', showLabel: false } },
	{ key: 'class', label: 'Class', span: 2, card: { zone: 'body', showLabel: true } },
	{ key: 'average', label: 'Average', span: 2, card: { zone: 'footer', showLabel: true } },
	{ key: 'attendance', label: 'Attendance', span: 2, card: { zone: 'footer', defaultVisible: false } },
];

describe('list card fields', () => {
	it('groups card fields by zone and default visibility', () => {
		const grouped = cardFieldsByZone(columns);
		expect(grouped.header.map(column => column.key)).toEqual(['name']);
		expect(grouped.body.map(column => column.key)).toEqual(['class']);
		expect(grouped.footer.map(column => column.key)).toEqual(['average']);
	});

	it('shows labels programmatically from column metadata', () => {
		const name = columns[0] as CardFieldColumn;
		const classField = columns[1] as CardFieldColumn;
		const average = columns[2] as CardFieldColumn;

		expect(cardFieldShowsLabel(name)).toBe(false);
		expect(cardFieldShowsLabel(classField)).toBe(true);
		expect(cardFieldShowsLabel(average)).toBe(true);
	});

	it('defaults labels off in header and on elsewhere', () => {
		const headerColumn = {
			key: 'title',
			label: 'Title',
			span: 2,
			card: { zone: 'header' },
		} satisfies CardFieldColumn;
		const bodyColumn = {
			key: 'notes',
			label: 'Notes',
			span: 2,
			card: { zone: 'body' },
		} satisfies CardFieldColumn;

		expect(cardFieldShowsLabel(headerColumn)).toBe(false);
		expect(cardFieldShowsLabel(bodyColumn)).toBe(true);
	});
});
