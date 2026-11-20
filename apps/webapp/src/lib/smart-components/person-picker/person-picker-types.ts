export interface PersonPickerItem {
	id: string;
	name: string;
	initials: string;
	photoUrl?: string | null;
	subtitle?: string;
	hint?: string;
	searchText?: string;
	disabled?: boolean;
}
