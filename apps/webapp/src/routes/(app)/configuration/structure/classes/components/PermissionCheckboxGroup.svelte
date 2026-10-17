<script lang="ts">
	import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import { t } from '$lib/i18n';
	import PermissionScopeTypes from '$lib/smart-components/scope-builder/PermissionScopeTypes.svelte';

	type Permission = PermissionCatalogEntry['permission'];

	let {
		entries,
		selected = $bindable<Permission[]>([]),
	}: {
		entries: readonly PermissionCatalogEntry[];
		selected?: Permission[];
	} = $props();

	const selectedSet = $derived(new Set(selected));

	function toggle(permission: Permission, checked: boolean | 'indeterminate') {
		if (checked === 'indeterminate') {
			return;
		}
		selected = checked
			? [...new Set([...selected, permission])]
			: selected.filter(entry => entry !== permission);
	}
</script>

<div class="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
	{#each entries as entry (entry.permission)}
		<label class="flex items-start gap-2 text-sm">
			<Checkbox
				class="mt-0.5"
				checked={selectedSet.has(entry.permission)}
				onCheckedChange={checked => toggle(entry.permission, checked)}
			/>
			<span>
				<span class="font-medium">{formatPermissionLabel(entry.permission, $t)}</span>
				<PermissionScopeTypes {entry} />
			</span>
		</label>
	{/each}
	{#if entries.length === 0}
		<p class="text-xs text-muted-foreground">{$t('staff.assignmentNoPermissions')}</p>
	{/if}
</div>
