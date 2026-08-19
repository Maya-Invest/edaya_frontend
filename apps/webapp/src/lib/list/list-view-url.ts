export const LIST_VIEW_QUERY_KEY = 'view';
export const LIST_CARD_COLUMNS_QUERY_KEY = 'cardColumns';

export type ListView = 'table' | 'cards';
export type ListCardColumns = 1 | 2 | 3 | 4 | 5;

const ALLOWED_CARD_COLUMNS = [1, 2, 3, 4, 5] as const;

export function isListCardColumns(value: number): value is ListCardColumns {
	return (ALLOWED_CARD_COLUMNS as readonly number[]).includes(value);
}

export function readListView(url: URL, fallback: ListView = 'table'): ListView {
	const value = url.searchParams.get(LIST_VIEW_QUERY_KEY);
	return value === 'table' || value === 'cards' ? value : fallback;
}

export function writeListView(url: URL, view: ListView): string {
	const next = new URL(url);
	next.searchParams.set(LIST_VIEW_QUERY_KEY, view);
	return `${next.pathname}${next.search}`;
}

export function readListCardColumns(
	url: URL,
	fallback: ListCardColumns = 3,
): ListCardColumns {
	const raw = url.searchParams.get(LIST_CARD_COLUMNS_QUERY_KEY);
	if (raw === null) {
		return fallback;
	}
	const value = Number(raw);
	return isListCardColumns(value) ? value : 3;
}

export function writeListCardColumns(url: URL, columns: ListCardColumns): string {
	const next = new URL(url);
	next.searchParams.set(LIST_CARD_COLUMNS_QUERY_KEY, String(columns));
	return `${next.pathname}${next.search}`;
}
