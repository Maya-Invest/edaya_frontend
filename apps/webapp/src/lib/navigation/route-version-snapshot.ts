import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { entityVersions } from '$lib/entity-versions.svelte';

/** Tracks entity-version families a route depends on for pull-based invalidation. */
export class RouteVersionSnapshot {
	private snapshots = new Map<EntityVersionKey, number>();

	constructor(private readonly families: readonly EntityVersionKey[]) {}

	capture() {
		return new Map(this.families.map(family => [family, entityVersions[family]]));
	}

	markLoaded(snapshot = this.capture()) {
		this.snapshots = snapshot;
	}

	isStale(): boolean {
		return this.families.some(
			family => (this.snapshots.get(family) ?? -1) !== entityVersions[family],
		);
	}

	hasLoaded(): boolean {
		return this.families.every(family => this.snapshots.has(family));
	}
}
