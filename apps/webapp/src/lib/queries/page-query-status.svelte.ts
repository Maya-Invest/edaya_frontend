/** Tracks which list routes have finished their active `PageQuery` load. */
class PageQueryStatus {
	private readyKeys = $state<Record<string, true>>({});

	markPending(key: string) {
		if (!(key in this.readyKeys)) {
			return;
		}
		const next = { ...this.readyKeys };
		delete next[key];
		this.readyKeys = next;
	}

	markReady(key: string) {
		this.readyKeys = { ...this.readyKeys, [key]: true };
	}

	isReady(key: string): boolean {
		return this.readyKeys[key] === true;
	}

	reset() {
		this.readyKeys = {};
	}
}

export const pageQueryStatus = new PageQueryStatus();
