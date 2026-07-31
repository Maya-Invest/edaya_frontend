import type { StaffMember } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchStaffMembers } from '$lib/api/staff-data';

export class StaffPickerState {
	staff = $state<StaffMember[]>([]);
	loading = $state(false);
	loaded = $state(false);

	private loadVersion = 0;

	async ensureLoaded(): Promise<void> {
		if (this.loaded || this.loading) {
			return;
		}

		const schoolId = academicContext.schools[0]?.id ?? '';
		const academicYearId = academicContext.yearId;
		if (!schoolId || !academicYearId) {
			return;
		}

		const version = ++this.loadVersion;
		this.loading = true;
		try {
			const client = getBrowserSchoolClient();
			const members = await fetchStaffMembers(client, { schoolId, academicYearId });
			if (version !== this.loadVersion) {
				return;
			}
			this.staff = members;
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
		this.staff = [];
		this.loading = false;
		this.loaded = false;
	}
}
