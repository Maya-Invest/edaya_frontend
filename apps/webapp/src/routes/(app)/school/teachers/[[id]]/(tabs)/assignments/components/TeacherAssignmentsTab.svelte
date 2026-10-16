<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { Teacher } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { Pencil, Plus, Trash2 } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import { getTeachersPageState } from '../../../../teachers-page.svelte';
	import { getTeacherAssignmentsTabState } from '../teacher-assignments-tab.svelte';
	import TeacherAssignmentFormModal from './TeacherAssignmentFormModal.svelte';

	const { teacher }: { teacher: Teacher } = $props();

	const teachersPage = getTeachersPageState();
	const assignmentsTab = getTeacherAssignmentsTabState();

	const modals = createUrlSyncedModals({ allowed: ['form', 'delete-assignment'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const formOpen = bindUrlModal(modals, 'form');
	const deleteOpen = bindUrlModal(modals, 'delete-assignment');

	let deleteBusy = $state(false);

	const rows = $derived(assignmentsTab.assignmentsFor(teacher.id));
	const editingAssignment = $derived(
		formOpen.open && modals.target
			? rows.find(row => row.id === modals.target) ?? null
			: null,
	);
	const deletingAssignment = $derived(
		deleteOpen.open && modals.target
			? rows.find(row => row.id === modals.target) ?? null
			: null,
	);

	$effect(() => {
		const classSubjectIds = rows
			.map(row => row.classSubjectId)
			.filter((id): id is string => Boolean(id));
		if (classSubjectIds.length === 0) {
			return;
		}
		void teachersPage.ensureClassSubjectsCached(classSubjectIds);
	});

	function classLabel(classGroupId: string | null | undefined): string {
		if (!classGroupId) {
			return '—';
		}
		return academicContext.classes.find(entry => entry.id === classGroupId)?.name ?? classGroupId;
	}

	function classIdFor(row: components['schemas']['TeacherAssignment']): string | null {
		if (row.kind === 'subject' && row.classSubjectId) {
			return teachersPage.subjects.find(entry => entry.id === row.classSubjectId)?.classId
				?? row.classGroupId
				?? null;
		}
		return row.classGroupId ?? null;
	}

	function targetLabel(row: components['schemas']['TeacherAssignment']): string {
		if (row.kind === 'subject' && row.classSubjectId) {
			const className = classLabel(classIdFor(row));
			return `${className} · ${teachersPage.subjectLabel(row.classSubjectId)}`;
		}
		return classLabel(row.classGroupId);
	}

	async function confirmDelete() {
		if (!deletingAssignment || deleteBusy) {
			return;
		}
		deleteBusy = true;
		const ok = await teachersPage.deleteAssignment({
			id: deletingAssignment.id,
			teacherId: teacher.id,
			successMessage: get(t)('teacher.assignmentDeleted'),
		});
		if (ok) {
			assignmentsTab.removeAssignment(deletingAssignment.id);
			teachersPage.setAssignmentCount(teacher.id, rows.length - 1);
			deleteOpen.open = false;
		}
		deleteBusy = false;
	}
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h4 class="text-sm font-semibold">{$t('teacher.assignmentsTitle')}</h4>
			<p class="text-xs text-muted-foreground">{$t('teacher.assignmentsHint')}</p>
		</div>
		<PermissionGate permission="STAFF_UPDATE" mode="disable">
			{#snippet children({ disabled })}
				<Button size="sm" class="rounded-full" {disabled} onclick={() => modals.open('form')}>
					<Plus class="mr-1.5 h-3.5 w-3.5" />
					{$t('teacher.addAssignment')}
				</Button>
			{/snippet}
		</PermissionGate>
	</div>

	{#each ['homeroom', 'subject'] as kind (kind)}
		{@const sectionRows = rows.filter(row => row.kind === kind)}
		<section class="space-y-2" aria-labelledby={`teacher-assignments-${kind}`} data-testid={`teacher-assignments-${kind}`}>
			<h4 id={`teacher-assignments-${kind}`} class="text-sm font-semibold">{$t(`teacher.assignmentSection.${kind}`)}</h4>
			{#if sectionRows.length === 0}
				<p class="text-sm text-muted-foreground">{$t(`teacher.assignmentSectionEmpty.${kind}`)}</p>
			{:else}
				<ul class="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
					{#each sectionRows as row (row.id)}
						<li class="flex items-start justify-between gap-3 px-4 py-3">
							<div class="min-w-0 flex-1">
								<div class="text-sm font-medium">
									{targetLabel(row)}
								</div>
								{#if classIdFor(row)}
									<a
										href={detailHref.classPlanning(classIdFor(row) ?? '')}
										class="mt-1 inline-block text-xs font-medium text-primary hover:underline"
									>
										{$t('teacher.openClassTimetable')}
									</a>
								{/if}
							</div>
							<PermissionGate permission="STAFF_UPDATE" mode="disable">
								{#snippet children({ disabled })}
									<RowActionMenu>
										<RowActionMenuItem
											{disabled}
											onclick={() => modals.open('form', { target: row.id })}
										>
											<Pencil class="h-4 w-4 text-muted-foreground" />
											{$t('common.edit')}
										</RowActionMenuItem>
										<RowActionMenuItem
											{disabled}
											destructive
											onclick={() => modals.open('delete-assignment', { target: row.id })}
										>
											<Trash2 class="h-4 w-4" />
											{$t('common.delete')}
										</RowActionMenuItem>
									</RowActionMenu>
								{/snippet}
							</PermissionGate>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/each}
</div>

<TeacherAssignmentFormModal bind:open={formOpen.open} {teacher} assignment={editingAssignment} />
<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('teacher.deleteAssignmentTitle')}
	description={$t('teacher.deleteAssignmentDescription')}
	confirmLabel={$t('common.delete')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
