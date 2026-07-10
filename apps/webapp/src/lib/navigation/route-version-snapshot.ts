import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { entityVersions } from '$lib/entity-versions.svelte';

/** Tracks entity-version families a route depends on for pull-based invalidation. */
export class RouteVersionSnapshot {
	private snapshots = new Map<EntityVersionKey, number>();

	constructor(private readonly families: readonly EntityVersionKey[]) {}

	markLoaded() {
		for (const family of this.families) {
			this.snapshots.set(family, entityVersions[family]);
		}
	}

	isStale(): boolean {
		return this.families.some(
			family => (this.snapshots.get(family) ?? -1) !== entityVersions[family],
		);
	}
}
