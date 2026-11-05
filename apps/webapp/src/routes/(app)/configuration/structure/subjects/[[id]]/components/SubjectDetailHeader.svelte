<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import SubjectFormModal from '$lib/components/school/academics/SubjectFormModal.svelte';

	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { lang, t } from '$lib/i18n';
	import { catalogSubjectName } from '$lib/i18n/catalog-label';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { getSubjectsPageState } from '../../subjects-page.svelte';

	const {
		subject,
		onDeleted,
	}: {
		subject: Subject;
		onDeleted?: () => void;
	} = $props();

	type SubjectDrawerModal = 'edit-subject' | 'delete';

	const subjectsPage = getSubjectsPageState();
	const modals = createUrlSyncedModals<SubjectDrawerModal>({
		allowed: ['edit-subject', 'delete'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editSubjectOpen = bindUrlModal(modals, 'edit-subject');
	const deleteOpen = bindUrlModal(modals, 'delete');

	let deleteBusy = $state(false);
	let removeCatalogBusy = $state(false);

	const isCatalogSubject = $derived(Boolean(subject.gradeLevelId));
	const localizedName = $derived(catalogSubjectName(subject.name, $lang, subject.shortName));

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
				deleteOpen.open = false;
				onDeleted?.();
			}
		}
		finally {
			deleteBusy = false;
		}
	}

	async function removeFromCatalog() {
		removeCatalogBusy = true;
		try {
			const ok = await subjectsPage.performRemoveSubjectFromGradeLevel({
				subjectId: subject.id,
				successMessage: get(t)('subjects.removedFromCatalog'),
			});
			if (ok) {
				subjectsPage.removeSubject(subject.id);
				onDeleted?.();
			}
		}
		finally {
			removeCatalogBusy = false;
		}
	}
</script>

<DrawerEntityHeader name={localizedName} summary={subject.description}>
	{#snippet chips()}
		<span class="rounded-full bg-secondary px-2 py-0.5 font-sans tabular-nums text-[10px] tabular-nums text-foreground/80">
			{subject.periodsPerWeek == null ? '—' : $t('structure.periodsPerWeek', { n: subject.periodsPerWeek })}
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
			class="flex h-14 w-14 items-center justify-center rounded-collection bg-primary font-display text-sm font-semibold text-primary-foreground"
		>
			{teacherInitials}
		</span>
	{/snippet}
	{#snippet actions()}
		<PermissionGate permission="ACADEMIC_PROGRAM_MANAGE" gradeLevelId={subject.gradeLevelId} subjectId={subject.id} mode="disable">
			{#snippet children({ disabled, title })}
				<Button {disabled} {title} variant="outline" size="sm" onclick={() => modals.open('edit-subject')}>
					{$t('common.edit')}
				</Button>
			{/snippet}
		</PermissionGate>
	{/snippet}
	{#snippet overflow()}
		<PermissionGate permission="ACADEMIC_PROGRAM_MANAGE" gradeLevelId={subject.gradeLevelId} subjectId={subject.id}>
			{#if isCatalogSubject}
				<RowActionMenuItem destructive disabled={removeCatalogBusy} onclick={() => void removeFromCatalog()}>
					{$t('subjects.removeFromCatalog')}
				</RowActionMenuItem>
			{:else}
				<RowActionMenuItem destructive onclick={() => (deleteOpen.open = true)}>
					{$t('common.delete')}
				</RowActionMenuItem>
			{/if}
		</PermissionGate>
	{/snippet}
</DrawerEntityHeader>

<SubjectFormModal reportModules={subjectsPage.slice?.configuration?.modules ?? []} reportConfigurationRevision={subjectsPage.slice?.configuration?.settings.revision} canConfigureModule={hasPermission('REPORT_CARD_CONFIGURE', { gradeLevelId: subject.gradeLevelId })} onLoadParticipationRevisions={subjectsPage.onLoadParticipationRevisions} onLoadCategories={subjectsPage.onLoadCategories} onCreateSchedule={subjectsPage.performCreateSchedule} onCreateSubjectForClass={subjectsPage.performCreateSubjectForClass} onUpdateSubject={subjectsPage.performUpdateSubject} subject={subject} bind:open={editSubjectOpen.open} showTrigger={false} />

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('subjects.deleteConfirm', { name: localizedName })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDeleteSubject}
/>
