import type { ListEntityCardFieldConfig, ListEntityCardZone, ListEntityTableColumn } from '$lib/list/list-entity-table-types';

export type CardFieldColumn = ListEntityTableColumn & { card: ListEntityCardFieldConfig };

export function cardFieldColumns(columns: readonly ListEntityTableColumn[]): CardFieldColumn[] {
	return columns.filter((column): column is CardFieldColumn => {
		const card = column.card;
		return card !== false && card !== undefined && Boolean(card.zone);
	});
}

export function cardFieldsByZone(columns: readonly ListEntityTableColumn[]) {
	const grouped: Record<ListEntityCardZone, CardFieldColumn[]> = {
		header: [],
		body: [],
		footer: [],
	};

	for (const column of cardFieldColumns(columns)) {
		if (column.card.defaultVisible === false) {
			continue;
		}
		grouped[column.card.zone].push(column);
	}

	return grouped;
}

/** Label on card is opt-out for header, opt-in elsewhere unless `showLabel` is set explicitly. */
export function cardFieldShowsLabel(column: CardFieldColumn): boolean {
	if (column.card.showLabel === true) {
		return true;
	}
	if (column.card.showLabel === false) {
		return false;
	}
	return column.card.zone !== 'header';
}
