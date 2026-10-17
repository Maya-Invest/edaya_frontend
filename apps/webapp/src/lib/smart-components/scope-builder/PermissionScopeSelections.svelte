<script lang="ts">
	import type { UserScopeSelection, PermissionScopeGrain } from '$lib/api/grant-scopes';
	import { PERMISSION_SCOPE_GRAINS } from '$lib/api/grant-scopes';
	import { t } from '$lib/i18n';
	import ScopeBuilder from './ScopeBuilder.svelte';

	let { scopes = $bindable([]), grains = PERMISSION_SCOPE_GRAINS, active = true }: {
		scopes?: UserScopeSelection[];
		grains?: readonly PermissionScopeGrain[];
		active?: boolean;
	} = $props();
	let expanded = $state<Record<string, boolean>>({});
	function forGrain(grain: PermissionScopeGrain) {
		return scopes.filter(scope => (scope.kind === 'all' ? scope.grain : scope.kind) === grain);
	}
	function setGrain(grain: PermissionScopeGrain, next: UserScopeSelection[]) {
		scopes = [...scopes.filter(scope => (scope.kind === 'all' ? scope.grain : scope.kind) !== grain), ...next];
	}
</script>
<div class="space-y-3">
	{#each grains as grain (grain)}
		<details data-scope-grain={grain} class="rounded-xl border border-border p-3" open={expanded[grain] ?? forGrain(grain).length > 0}
			ontoggle={event => expanded = { ...expanded, [grain]: event.currentTarget.open }}>
			<summary class="cursor-pointer text-sm font-medium">{$t(`scope.grain.${grain}`)}</summary>
			<div class="mt-3"><ScopeBuilder {grain} active={active && (expanded[grain] ?? forGrain(grain).length > 0)} bind:scopes={() => forGrain(grain), next => setGrain(grain, next)} /></div>
		</details>
	{/each}
</div>
