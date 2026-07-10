export type ListEntityCardLayout = 'row' | 'split' | 'stack';

export function listEntityCardLayout(columnsPerRow: number): ListEntityCardLayout {
	if (columnsPerRow <= 1) {
		return 'row';
	}
	if (columnsPerRow === 2) {
		return 'split';
	}
	return 'stack';
}

const gridClassByColumns: Record<number, string> = {
	1: 'grid-cols-1',
	2: 'grid-cols-1 sm:grid-cols-2',
	3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
	4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
	5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
};

export function listEntityCardGridClass(columnsPerRow: number): string {
	const clamped = Math.min(5, Math.max(1, columnsPerRow));
	return gridClassByColumns[clamped] ?? gridClassByColumns[3];
}

export function clampCardColumnsPerRow(value: number): number {
	return Math.min(5, Math.max(1, Math.round(value)));
}
