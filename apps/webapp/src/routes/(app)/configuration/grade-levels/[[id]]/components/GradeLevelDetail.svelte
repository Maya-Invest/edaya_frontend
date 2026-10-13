<script lang="ts">
	import type { GradeLevel } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import GradeLevelFormModal from '../../components/GradeLevelFormModal.svelte';
	import GradingConfigurationModal from '../../components/GradingConfigurationModal.svelte';
	import { getGradeLevelsPageState } from '../../grade-levels-page.svelte';

	const { gradeLevel }: { gradeLevel: GradeLevel } = $props();

	const gradeLevelsPage = getGradeLevelsPageState();

	const modals = createUrlSyncedModals({
		allowed: ['edit', 'delete', 'grading'],
		allowedSteps: ['confirm'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');
	const deleteOpen = bindUrlModal(modals, 'delete');
	const gradingOpen = bindUrlModal(modals, 'grading');
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
	<DrawerEntityHeader
		name={live.name}
		summary={live.cycle}
	>
		{#snippet chips()}
			<span class="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
				{$t('gradeLevels.order')}: {live.order}
			</span>
		{/snippet}
		{#snippet actions()}
			<PermissionGate permission="REPORT_CARD_CONFIGURE" mode="disable">
				{#snippet children({ disabled })}<Button variant="outline" {disabled} onclick={() => {
					void gradeLevelsPage.loadGrading(live.id);
					gradingOpen.open = true;
				}}>{$t('grading.configure')}</Button>{/snippet}
			</PermissionGate>
			<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE" mode="disable">
				{#snippet children({ disabled, title })}
					<button
						type="button"
						class="inline-flex h-9 items-center rounded-full border border-input bg-background px-4 text-sm font-medium transition hover:bg-secondary disabled:opacity-50"
						{disabled}
						{title}
						onclick={() => (editOpen.open = true)}
					>
						{$t('gradeLevels.edit')}
					</button>
					<button
						type="button"
						class="inline-flex h-9 items-center rounded-full border border-destructive/30 bg-background px-4 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
						disabled={disabled || !canDelete}
						title={canDelete ? title : $t('gradeLevels.deleteBlockedClasses')}
						onclick={() => (deleteOpen.open = true)}
					>
						{$t('common.delete')}
					</button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	<div class="space-y-2 rounded-xl border border-border p-3">
		<p class="font-medium">{policy?.aggregateLabel ?? $t('grading.legacy')}</p>
		{#if policy}
			<p class="text-sm text-muted-foreground">{policy.scale.name} · {policy.mode === 'mention-first' ? $t('grading.mention') : $t('grading.numeric')}</p>
			<p role="status" class="text-sm">{$t(`grading.${policy.status}`)}</p>
			{#if policy.status === 'failed'}<PermissionGate permission="REPORT_CARD_CONFIGURE"><Button variant="outline" onclick={() => gradeLevelsPage.retryGrading(live.id, policy.revision)}>{$t('common.retry')}</Button></PermissionGate>{/if}
		{/if}
	</div>
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('gradeLevels.name')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{live.name}</div>
		</DrawerField>
		<DrawerField label={$t('gradeLevels.label')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{live.label}</div>
		</DrawerField>
		<DrawerField label={$t('gradeLevels.cycle')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{live.cycle || '—'}</div>
		</DrawerField>
		<DrawerField label={$t('gradeLevels.order')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{live.order}</div>
		</DrawerField>
		<DrawerField label={$t('gradeLevels.classCount')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{classCount}</div>
		</DrawerField>
	</div>
</div>

<GradeLevelFormModal bind:open={editOpen.open} gradeLevel={live} />

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('gradeLevels.deleteConfirm', { name: live.name })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>

<GradingConfigurationModal bind:open={gradingOpen.open} gradeLevel={live} confirm={modals.step === 'confirm'} onConfirmStep={value => modals.setStep(value ? 'confirm' : null)} />
