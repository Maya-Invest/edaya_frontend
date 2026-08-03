import {
	fetchConsortiumSchools,
	fetchMyConsortium,
	type ConsortiumDto,
	type ConsortiumSchoolDto,
} from '$lib/api/consortium-data';
import type { SessionKind } from '$lib/auth/account-actor';

class ConsortiumShell {
	ready = $state(false);
	consortium = $state<ConsortiumDto | null>(null);
	schools = $state<ConsortiumSchoolDto[]>([]);

	private loadPromise: Promise<void> | null = null;

	async ensureLoaded(sessionKind: SessionKind | null): Promise<void> {
		if (sessionKind !== 'staff') {
			return;
		}
		if (this.ready) {
			return;
		}
		if (this.loadPromise) {
			return this.loadPromise;
		}

		this.loadPromise = (async () => {
			try {
				const consortium = await fetchMyConsortium();
				this.consortium = consortium;
				this.schools = consortium
					? await fetchConsortiumSchools(consortium.id)
					: [];
			}
			catch {
				this.consortium = null;
				this.schools = [];
			}
			finally {
				this.ready = true;
				this.loadPromise = null;
			}
		})();

		return this.loadPromise;
	}

	reset() {
		this.ready = false;
		this.consortium = null;
		this.schools = [];
		this.loadPromise = null;
	}
}

export const consortiumShell = new ConsortiumShell();
