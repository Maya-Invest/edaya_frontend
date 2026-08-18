<script lang="ts">
	import type { Evaluation } from '$lib/types/school';
	import { page } from '$app/stores';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import EvaluationCreateModal from '../../components/EvaluationCreateModal.svelte';
	import { getEvaluationsPageState } from '../../evaluations-page.svelte';

	const {
		classId,
		evaluation,
		onDeleted,
	}: {
		classId: string;
		evaluation: Evaluation;
		onDeleted?: () => void;
	} = $props();

	type EvaluationDrawerModal = 'edit' | 'delete';

	const evaluationsPage = getEvaluationsPageState();
	const modals = createUrlSyncedModals<EvaluationDrawerModal>({
		allowed: ['edit', 'delete'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');
	const deleteOpen = bindUrlModal(modals, 'delete');

	const isHomework = $derived(evaluation.kind === 'homework');
	const formattedDate = $derived(
		evaluation.date
			? formatLocaleDate(evaluation.date, $locale, {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			})
			: '-',
	);

	let deleteBusy = $state(false);

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await evaluationsPage.deleteEvaluation({
				assessmentId: evaluation.id,
				successMessage: get(t)('eval.toastDeleted', { title: evaluation.title }),
			});
			if (ok) {
				deleteOpen.open = false;
				onDeleted?.();
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<DrawerEntityHeader name={evaluation.title} summary="{evaluation.subject} - {formattedDate}">
	{#snippet chips()}
		<span
			class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			{$t(`eval.kind.${evaluation.kind}`)}
		</span>
	{/snippet}
	{#snippet actions()}
		<PermissionGate permission="GRADE_INPUT" mode="disable" tooltip={$t('eval.permissionCreate')}>
			{#snippet children({ disabled, title })}
				{#if isHomework}
					<Button variant="outline" size="sm" class="rounded-full" {disabled} {title} onclick={() => (editOpen.open = true)}>
						{$t('common.edit')}
					</Button>
				{/if}
			{/snippet}
		</PermissionGate>
	{/snippet}
	{#snippet overflow()}
		<PermissionGate permission="GRADE_INPUT" mode="disable" tooltip={$t('eval.permissionCreate')}>
			{#snippet children({ disabled, title })}
				<RowActionMenuItem
					{disabled}
					{title}
					onclick={() => (editOpen.open = true)}
				>
					{$t('common.edit')}
				</RowActionMenuItem>
				<RowActionMenuItem
					destructive
					{disabled}
					{title}
					onclick={() => (deleteOpen.open = true)}
				>
					{$t('common.delete')}
				</RowActionMenuItem>
			{/snippet}
		</PermissionGate>
	{/snippet}
</DrawerEntityHeader>

<EvaluationCreateModal evaluation={evaluation} {classId} bind:open={editOpen.open} />

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('eval.deleteConfirm', { title: evaluation.title })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
