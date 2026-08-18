import type { Student } from '$lib/types/school';
import { fetchPeopleSources, mapStudents } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

export class StudentPickerState {
	students = $state<Student[]>([]);
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
			const schoolId = authSession.schoolId ?? '';
			if (!schoolId) {
				return;
			}
			const client = getBrowserSchoolClient();
			const sources = await fetchPeopleSources(client, schoolId);
			if (version !== this.loadVersion) {
				return;
			}
			this.students = mapStudents(sources);
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
		this.students = [];
		this.loading = false;
		this.loaded = false;
	}
}
