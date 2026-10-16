<script lang="ts">
	import type { RenderedPermissionScope } from '$lib/api/permission-scope-labels';
	import { permissionScopeKey, permissionScopeLabel } from '$lib/api/permission-scope-labels';
	import { t } from '$lib/i18n';
	import { BADGE, BADGE_WARN } from '$lib/ui-tones';

	const { scopes, emptyLabel, inline = false }: { scopes: RenderedPermissionScope[]; emptyLabel: string; inline?: boolean } = $props();
</script>

{#if scopes.length}
	<span class="flex max-w-full flex-wrap gap-1.5 {inline ? '' : 'mt-2'}" data-testid="scope-tags">
		{#each scopes as scope (permissionScopeKey(scope.scope))}
			<span class="max-w-full break-words rounded-full px-2.5 py-1 text-xs {scope.missing ? BADGE_WARN : BADGE}" data-testid="scope-tag">
				{permissionScopeLabel(scope, $t)}
			</span>
		{/each}
	</span>
{:else}
	<span class="block text-xs text-muted-foreground {inline ? '' : 'mt-1'}">{emptyLabel}</span>
{/if}
