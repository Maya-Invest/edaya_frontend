import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadPermissionCatalog } from '$lib/api/staff-permission-assignments-data';

export class StaffPermissionFormModalState {
	catalog = $state<PermissionCatalogEntry[]>([]);
	loading = $state(false);
	loaded = $state(false);

	private loadVersion = 0;

	async ensureLoaded(): Promise<void> {
		if (this.loaded || this.loading) {
			return;
		}

		const version = ++this.loadVersion;
		this.loading = true;
		try {
			const client = getBrowserSchoolClient();
			const entries = await loadPermissionCatalog(client);
			if (version !== this.loadVersion) {
				return;
			}
			this.catalog = entries;
			this.loaded = true;
		}
		finally {
			if (version === this.loadVersion) {
				this.loading = false;
			}
		}
	}

	reset() {
		this.loadVersion += 1;
		this.catalog = [];
		this.loading = false;
		this.loaded = false;
	}
}
