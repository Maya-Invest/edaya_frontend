<script lang="ts">
	import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';
	import { permissionSelectionGrains } from '$lib/api/grant-scopes';
	import { t } from '$lib/i18n';
	import { BADGE } from '$lib/ui-tones';

	const { entry }: { entry?: PermissionCatalogEntry } = $props();
	const grains = $derived(entry ? permissionSelectionGrains(entry) : []);
</script>

{#if grains.length}
	<span class="inline-flex max-w-full flex-wrap items-center gap-1" data-testid="permission-scope-types" data-permission={entry?.permission} title={$t('scope.allowedTypes')}>
		<span class="sr-only">{$t('scope.allowedTypes')}:</span>
		{#each grains as grain (grain)}
			<span class="max-w-full break-words rounded-full px-2.5 py-1 text-xs font-normal {BADGE}" data-testid="permission-scope-type" data-scope-type={grain}>{$t(`scope.grain.${grain}`)}</span>
		{/each}
	</span>
{/if}
