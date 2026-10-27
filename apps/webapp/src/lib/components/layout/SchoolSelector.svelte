<script lang="ts">
	import { authSession } from '$lib/auth/session.svelte';
	import { switchActiveSchool } from '$lib/auth/switch-school';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { Building2 } from '$lib/icons';

	const { collapsed = false }: { collapsed?: boolean } = $props();
	const memberships = $derived(authSession.staffMemberships);
	const name = $derived(authSession.school?.shortName ?? authSession.activeStaffMembership?.schoolShortName ?? $t('sidebar.module'));
</script>
{#if memberships.length > 1}
	<div class="min-w-0" data-testid="school-selector"><Select.Root type="single" value={authSession.schoolId ?? undefined} onValueChange={(value) => {
		if (value && value !== authSession.schoolId)
			void switchActiveSchool(value);
	}}>
		<Select.Trigger data-testid="school-selector-menu" aria-label={$t('sidebar.switchSchool')}><span>{#if collapsed}<Building2 class="h-4 w-4" />{:else}{name}{/if}</span></Select.Trigger>
		<Select.Content align="start" side={collapsed ? 'right' : 'bottom'}>{#each memberships as membership (membership.actorId)}<Select.Item value={membership.schoolId} label={membership.schoolName} data-testid="school-selector-option" data-school-id={membership.schoolId}>{membership.schoolName}</Select.Item>{/each}</Select.Content>
	</Select.Root></div>
{:else if !collapsed}<p class="break-words text-xs text-muted-foreground" data-testid="school-selector">{name}</p>{/if}
