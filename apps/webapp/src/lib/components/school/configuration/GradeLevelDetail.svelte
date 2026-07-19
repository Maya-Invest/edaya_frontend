<script lang="ts">
	import type { GradeLevel } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteGradeLevelMutation } from '$lib/api/mutations/grade-level.mutations';
	import GradeLevelFormModal from '$lib/components/school/configuration/GradeLevelFormModal.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';

	const { gradeLevel }: { gradeLevel: GradeLevel } = $props();

	const modals = createUrlSyncedModals({ allowed: ['edit'], getUrl: () => $page.url });
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');

	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	const live = $derived(
		academicContext.gradeLevelById(gradeLevel.id) ?? gradeLevel,
	);
	const classCount = $derived(
		academicContext.classes.filter(entry => entry.gradeLevelId === live.id).length,
	);
	const canDelete = $derived(classCount === 0);

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await deleteGradeLevelMutation(live.id, {
				successMessage: get(t)('gradeLevels.toastDeleted', { name: live.name }),
			});
			if (ok) {
				deleteOpen = false;
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
						onclick={() => (deleteOpen = true)}
					>
						{$t('common.delete')}
					</button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('gradeLevels.name')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{live.name}</div>
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
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('gradeLevels.deleteConfirm', { name: live.name })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
