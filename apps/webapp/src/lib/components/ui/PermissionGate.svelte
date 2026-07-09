<script lang="ts">
	import type { PermissionCode } from '$lib/auth/types';
	import type { Snippet } from 'svelte';
	import { hasPermission } from '$lib/permissions';

	const {
		permission,
		classId,
		subject,
		tooltip = 'Action non autorisée',
		mode = 'hide',
		children,
	}: {
		permission: PermissionCode;
		classId?: string;
		subject?: string;
		tooltip?: string;
		mode?: 'hide' | 'disable';
		children?: Snippet<[{ disabled: boolean; title?: string }]>;
	} = $props();

	const allowed = $derived(hasPermission(permission, { classId, subject }));
</script>

{#if allowed || mode === 'disable'}
	{@render children?.({ disabled: !allowed, title: allowed ? undefined : tooltip })}
{/if}
