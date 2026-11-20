import type { StaffPermissionFormData } from '$lib/api/staff-permission-profiles-data';

export class StaffPermissionFormDataState {
	data = $state<StaffPermissionFormData | null>(null);
	loading = $state(false);
	error = $state(false);
	private version = 0;

	constructor(private readonly loader: (schoolId: string) => Promise<StaffPermissionFormData>) {}

	reset() {
		this.version += 1;
		this.data = null;
		this.error = false;
		this.loading = false;
	}

	async load(schoolId: string) {
		this.reset();
		if (!schoolId)
			return;
		const version = this.version;
		this.loading = true;
		try {
			const data = await this.loader(schoolId);
			if (version === this.version)
				this.data = data;
		}
		catch {
			if (version === this.version)
				this.error = true;
		}
		finally {
			if (version === this.version)
				this.loading = false;
		}
	}
}
