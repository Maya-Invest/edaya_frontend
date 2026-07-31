import type { PersonPickerItem } from './person-picker-types';

export function filterPersonPickerItems(items: readonly PersonPickerItem[], query: string): PersonPickerItem[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) {
		return [...items];
	}

	return items.filter((item) => {
		const haystack = [item.name, item.subtitle, item.hint, item.searchText]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		return haystack.includes(normalized);
	});
}
