<script lang="ts">
	import type { School } from '$lib/types/school';
	import { privateAttachmentContentPath } from '$lib/api/school-data';
	import { authSession } from '$lib/auth/session.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import { Building2 } from '$lib/icons';

	const { schools }: { schools: School[] } = $props();

	const school = $derived(authSession.school ?? schools[0]);
	const logoUrl = $derived(
		school?.logoAttachmentId ? privateAttachmentContentPath(school.logoAttachmentId) : null,
	);
</script>

{#if school}
	<div
		class="flex h-9 max-w-[11rem] items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium"
		title={school.name}
	>
		{#if logoUrl}
			<PersonAvatar
				name={school.name}
				initials={school.shortName.charAt(0)}
				photoUrl={logoUrl}
				size="xs"
			/>
		{:else}
			<Building2 class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
		{/if}
		<span class="truncate">{school.shortName}</span>
	</div>
{/if}
