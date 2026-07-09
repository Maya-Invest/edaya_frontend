<script lang="ts">
	import type { School } from '$lib/types/school';
	import { authSession } from '$lib/auth/session.svelte';
	import { Building2 } from '$lib/icons';

	const { schools }: { schools: School[] } = $props();

	const school = $derived(authSession.school ?? schools[0]);
</script>

{#if school}
	<div
		class="flex h-9 max-w-[11rem] items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium"
		title={school.name}
	>
		<Building2 class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
		<span class="truncate">{school.shortName}</span>
	</div>
{/if}
