import type { components } from '$lib/api/schema';

type Report = components['schemas']['PermissionResolutionReport'];

/** A review belongs to one command, request, and open form session. */
export class PermissionImpactPreviewState {
	report = $state<Report | null>(null);
	loading = $state(false);
	private version = 0;
	private key = '';
	private active = false;

	synchronize(active: boolean, payload: unknown) {
		const key = JSON.stringify(payload);
		if (active !== this.active || key !== this.key) {
			this.version += 1;
			this.report = null;
			this.loading = false;
			this.active = active;
			this.key = key;
		}
	}

	reviewed(payload: unknown) {
		return this.active && this.report !== null && this.key === JSON.stringify(payload);
	}

	reset() {
		this.version += 1;
		this.report = null;
		this.loading = false;
		this.active = false;
	}

	async review<T>(payload: T, request: (snapshot: T) => Promise<{ resolution: Report } | null>, current: () => T, active: () => boolean) {
		this.synchronize(active(), payload);
		const key = JSON.stringify(payload);
		const snapshot: T = JSON.parse(key);
		const version = ++this.version;
		this.report = null;
		this.loading = true;
		try {
			const result = await request(snapshot);
			if (version === this.version && active() && key === JSON.stringify(current()))
				this.report = result?.resolution ?? null;
		}
		finally {
			if (version === this.version)
				this.loading = false;
		}
	}
}
