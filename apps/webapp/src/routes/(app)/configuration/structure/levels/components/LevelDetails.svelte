<script lang="ts">
	import type { GradeLevel } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasAnyPermission } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { getGradeLevelsPageState } from '../grade-levels-page.svelte';
	import GradeLevelFormModal from './GradeLevelFormModal.svelte';

	const { gradeLevel }: { gradeLevel: GradeLevel } = $props();

	const gradeLevelsPage = getGradeLevelsPageState();

	const modals = createUrlSyncedModals({
		allowed: ['edit-level', 'delete-level'],
		allowedSteps: ['confirm'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit-level');
	const deleteOpen = bindUrlModal(modals, 'delete-level');
	const policy = $derived((gradeLevelsPage.gradingLevel?.id === gradeLevel.id ? gradeLevelsPage.gradingLevel : gradeLevel)?.gradingPolicies?.filter(row => row.academicYearId === academicContext.yearId).toSorted((a, b) => b.revision - a.revision)[0]);
	$effect(() => {
		void gradeLevelsPage.loadGrading(gradeLevel.id);
	});
	$effect(() => {
		if (policy?.status !== 'updating')
			return;
		const timer = setInterval(() => {
			void gradeLevelsPage.loadGrading(gradeLevel.id);
		}, 5000);
		return () => clearInterval(timer);
	});

	let deleteBusy = $state(false);

	const live = $derived(
		gradeLevelsPage.gradeLevelById(gradeLevel.id) ?? gradeLevel,
	);
	const classCount = $derived(gradeLevelsPage.classCountFor(live.id));
	const canDelete = $derived(classCount === 0);

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await gradeLevelsPage.deleteGradeLevel({
				gradeLevelId: live.id,
				successMessage: get(t)('gradeLevels.toastDeleted', { name: live.name }),
			});
			if (ok) {
				deleteOpen.open = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<div class="space-y-5">
	<ListPageHeader
		level="section"
		title={$t('structure.details')}
	>
		{#snippet primary()}
			<Button variant="outline" disabled={!hasAnyPermission(['SCHOOL_CONFIGURE', 'REPORT_CARD_CONFIGURE'])} onclick={() => (editOpen.open = true)}>{$t('gradeLevels.edit')}</Button>
		{/snippet}
		{#snippet more()}
			<RowActionMenu label={$t('list.moreActions')}>
				<PermissionGate permission="SCHOOL_CONFIGURE" mode="disable">
					{#snippet children({ disabled, title })}
						<RowActionMenuItem title={canDelete ? title : $t('gradeLevels.deleteBlockedClasses')} destructive disabled={disabled || !canDelete} onclick={() => modals.open('delete-level')}>
							{$t('common.delete')}
						</RowActionMenuItem>
					{/snippet}
				</PermissionGate>
			</RowActionMenu>
		{/snippet}
	</ListPageHeader>

	<dl class="grid gap-6 rounded-collection border border-border bg-card p-5 shadow-soft sm:grid-cols-2">
		<div><dt class="text-sm text-muted-foreground">{$t('gradeLevels.name')}</dt><dd class="mt-1 text-sm font-medium">{live.name}</dd></div>
		<div><dt class="text-sm text-muted-foreground">{$t('gradeLevels.label')}</dt><dd class="mt-1 text-sm font-medium">{live.shortName || '—'}</dd></div>
		<div><dt class="text-sm text-muted-foreground">{$t('gradeLevels.cycle')}</dt><dd class="mt-1 text-sm font-medium">{live.cycle || '—'}</dd></div>
		<div><dt class="text-sm text-muted-foreground">{$t('gradeLevels.order')}</dt><dd class="mt-1 text-sm font-medium">{live.order}</dd></div>
	</dl>

	<div class="space-y-2 rounded-collection border border-border bg-card p-5 shadow-soft">
		<p class="text-sm font-medium">{policy?.aggregateLabel ?? $t('grading.legacy')}</p>
		{#if policy}
			<p class="text-sm text-muted-foreground">{policy.scale.name} · {policy.mode === 'mention-first' ? $t('grading.mention') : $t('grading.numeric')}</p>
			<p role="status" class="text-sm">{$t(`grading.${policy.status}`)}</p>
			{#if policy.status === 'failed'}<PermissionGate permission="REPORT_CARD_CONFIGURE"><Button variant="outline" onclick={() => gradeLevelsPage.retryGrading(live.id, policy.revision)}>{$t('dataState.retry')}</Button></PermissionGate>{/if}
		{/if}
	</div>
</div>

<GradeLevelFormModal bind:open={editOpen.open} gradeLevel={live} confirm={modals.step === 'confirm'} onConfirmStep={value => modals.setStep(value ? 'confirm' : null)} />

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('gradeLevels.deleteConfirm', { name: live.name })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
