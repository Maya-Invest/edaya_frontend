import type { Guardian } from '$lib/types/school';
import { loadGuardiansPeopleData } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export class GuardianPickerState {
	guardians = $state<Guardian[]>([]);
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
			const data = await loadGuardiansPeopleData(client);
			if (version !== this.loadVersion) {
				return;
			}
			this.guardians = data.guardians;
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
		this.guardians = [];
		this.loading = false;
		this.loaded = false;
	}
}
