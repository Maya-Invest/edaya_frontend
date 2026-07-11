import { SvelteMap, SvelteSet } from 'svelte/reactivity';

export class ListSelectionState<T extends { id: string }> {
	selectionMode = $state(false);
	selectedIds = $state<string[]>([]);

	get selectedSet() {
		return new SvelteSet(this.selectedIds);
	}

	enterSelectionMode() {
		this.selectionMode = true;
	}

	exitSelectionMode() {
		this.selectionMode = false;
		this.clearSelection();
	}

	toggleSelected(id: string, checked: boolean) {
		this.selectedIds = checked
			? [...new SvelteSet([...this.selectedIds, id])]
			: this.selectedIds.filter(entry => entry !== id);
	}

	clearSelection() {
		this.selectedIds = [];
	}

	allVisibleSelected(rows: readonly T[]) {
		return rows.length > 0 && rows.every(row => this.selectedSet.has(row.id));
	}

	toggleVisible(rows: readonly T[], checked: boolean) {
		if (!checked) {
			this.selectedIds = this.selectedIds.filter(id => !rows.some(row => row.id === id));
			return;
		}
		this.selectedIds = [...new SvelteSet([...this.selectedIds, ...rows.map(row => row.id)])];
	}

	resolveSelected(pool: readonly T[]): T[] {
		const byId = new SvelteMap(pool.map(row => [row.id, row]));
		return this.selectedIds
			.map(id => byId.get(id))
			.filter((row): row is T => Boolean(row));
	}

	handleRowClick(row: T, onSelect?: (row: T) => void) {
		if (this.selectionMode) {
			this.toggleSelected(row.id, !this.selectedSet.has(row.id));
			return;
		}
		onSelect?.(row);
	}

	handleRowKeydown(event: KeyboardEvent, row: T, onSelect?: (row: T) => void) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			this.handleRowClick(row, onSelect);
		}
	}
}
