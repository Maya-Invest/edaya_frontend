<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import SubjectFormModal from '$lib/components/school/academics/SubjectFormModal.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import { getSubjectsPageState } from '../../subjects-page.svelte';

	const {
		subject,
		onDeleted,
	}: {
		subject: Subject;
		onDeleted?: () => void;
	} = $props();

	type SubjectDrawerModal = 'edit-subject';

	const subjectsPage = getSubjectsPageState();
	const modals = createUrlSyncedModals<SubjectDrawerModal>({
		allowed: ['edit-subject'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const editSubjectOpen = bindUrlModal(modals, 'edit-subject');

	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	const teacherInitials = $derived(
		subject.teacher
			.split(/\s+/)
			.map(part => part[0])
			.filter(Boolean)
			.slice(0, 2)
			.join('')
			.toUpperCase(),
	);

	async function confirmDeleteSubject() {
		deleteBusy = true;
		try {
			const ok = await subjectsPage.deleteSubject({
				classSubjectId: subject.id,
				successMessage: get(t)('subjects.toastDeleted', { name: subject.name }),
			});
			if (ok) {
				deleteOpen = false;
				onDeleted?.();
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<DrawerEntityHeader name={subject.name} summary={subject.description}>
	{#snippet chips()}
		<span class="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground/80">
			{$t('subjects.hoursPerWeek', { h: subject.hoursPerWeek })}
		</span>
		<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground/80">
			{subject.category}
		</span>
		{#if subject.teacher}
			<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground/80">
				{subject.teacher}
			</span>
		{/if}
	{/snippet}
	{#snippet avatar()}
		<span
			class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-sm font-semibold text-primary-foreground"
		>
			{teacherInitials}
		</span>
	{/snippet}
	{#snippet actions()}
		<Button variant="outline" size="sm" class="rounded-full" onclick={() => modals.open('edit-subject')}>
			{$t('common.edit')}
		</Button>
	{/snippet}
	{#snippet overflow()}
		{#if !subject.gradeLevelId}
			<RowActionMenuItem destructive onclick={() => (deleteOpen = true)}>
				{$t('common.delete')}
			</RowActionMenuItem>
		{/if}
	{/snippet}
</DrawerEntityHeader>

<SubjectFormModal subject={subject} bind:open={editSubjectOpen.open} showTrigger={false} />

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('subjects.deleteConfirm', { name: subject.name })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDeleteSubject}
/>
