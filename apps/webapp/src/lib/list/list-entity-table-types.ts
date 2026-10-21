export type ListEntityCardZone = 'header' | 'body' | 'footer';

export interface ListEntityCardFieldConfig {
	zone: ListEntityCardZone;
	/** When false, field is omitted from the card. */
	defaultVisible?: boolean;
	/** Show the column label above the field value. Header defaults to false. */
	showLabel?: boolean;
}

export interface ListEntityTableColumn {
	key: string;
	defaultVisible?: boolean;
	required?: boolean;
	available?: boolean;
	group?: string;
	minWidth?: number;
	label: string;
	span: number;
	spanInSelectionMode?: number;
	sortable?: boolean;
	class?: string;
	/** Card view placement. Omit or `false` to exclude from cards. */
	card?: ListEntityCardFieldConfig | false;
}

export interface ListEntityTableRowContext {
	selectionMode: boolean;
	selected: boolean;
	active: boolean;
}
