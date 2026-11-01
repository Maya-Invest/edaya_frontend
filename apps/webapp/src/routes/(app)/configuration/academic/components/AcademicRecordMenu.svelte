<script lang="ts">
	import type { AcademicModalCatalog, AcademicModalName } from '../lib/academic-modal-surface';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { academicActionReason } from '../lib/academic-modal-surface';

	const { id, label, period = false, catalog, onAction }: {
		id: string;
		label: string;
		period?: boolean;
		catalog: AcademicModalCatalog;
		onAction: (action: AcademicModalName, target: string) => void;
	} = $props();
	const actions = $derived((period
		? [
			['edit-period', 'academic.updatePeriod', false],
			['publish-period', 'academic.publishPeriod', true],
			['delete-period', 'academic.deletePeriod', false],
		]
		: [
			['edit-year', 'academic.updateYear', false],
			['create-period', 'academic.addPeriod', false],
			['publish-year', 'academic.publishYear', true],
			['archive-year', 'academic.archiveYear', true],
			['delete-year', 'academic.deleteYear', false],
		]) as [AcademicModalName, string, boolean][]);
	const available = $derived(actions.filter(([, , lifecycle]) => hasPermission(lifecycle ? 'SCHOOL_LIFECYCLE_MANAGE' : 'SCHOOL_CONFIGURE')));
</script>

{#if available.length}
	<div data-academic-menu={id}><RowActionMenu label={$t('academic.actionsFor', { label })}>
		{#each available as [action, key] (action)}
			{@const reason = academicActionReason(action, id, catalog)}
			<RowActionMenuItem disabled={!!reason} title={reason ? $t(reason) : undefined} destructive={action.startsWith('delete-')} onclick={() => onAction(action, id)}>
				<span class="min-w-0 break-words">{$t(key)}{#if reason}<span class="mt-1 block text-xs font-normal">{$t(reason)}</span>{/if}</span>
			</RowActionMenuItem>
		{/each}
	</RowActionMenu></div>
{/if}
