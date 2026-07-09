import type { DisciplinaryActionCatalogItem } from '$lib/types/discipline';

function clone<T>(value: T): T {
	return structuredClone(value);
}

export class DisciplineCatalogContext {
	actions = $state<DisciplinaryActionCatalogItem[]>([]);
	ready = $state(false);

	hydrate(rows: DisciplinaryActionCatalogItem[]) {
		this.actions = clone(rows);
		this.ready = true;
	}

	upsert(row: DisciplinaryActionCatalogItem) {
		const index = this.actions.findIndex(entry => entry.id === row.id);
		if (index === -1) {
			this.actions = [...this.actions, clone(row)];
			return;
		}
		const next = [...this.actions];
		next[index] = clone(row);
		this.actions = next;
	}

	remove(id: string) {
		this.actions = this.actions.filter(entry => entry.id !== id);
	}

	reset() {
		this.actions = [];
		this.ready = false;
	}
}

export const disciplineCatalogContext = new DisciplineCatalogContext();
