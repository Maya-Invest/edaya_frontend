export interface ListEntityTableColumn {
	key: string;
	label: string;
	span: number;
	spanInSelectionMode?: number;
	sortable?: boolean;
	class?: string;
}

export interface ListEntityTableRowContext {
	selectionMode: boolean;
	selected: boolean;
	active: boolean;
}
