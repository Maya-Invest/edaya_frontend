<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { Teacher } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Plus, Trash2 } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import { getTeachersPageState } from '../../../../teachers-page.svelte';
	import TeacherAssignmentFormModal from './TeacherAssignmentFormModal.svelte';

	const { teacher }: { teacher: Teacher } = $props();

	const teachersPage = getTeachersPageState();

	const modals = createUrlSyncedModals({ allowed: ['form'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const formOpen = bindUrlModal(modals, 'form');

	let deleteBusy = $state<string | null>(null);

	const rows = $derived(teachersPage.teacherAssignmentsForTeacher(teacher.id));

	function classLabel(classGroupId: string | null | undefined): string {
		if (!classGroupId) {
			return '—';
		}
		return academicContext.classes.find(entry => entry.id === classGroupId)?.name ?? classGroupId;
	}

	function targetLabel(row: components['schemas']['TeacherAssignment']): string {
		if (row.kind === 'subject' && row.classSubjectId) {
			const subject = teachersPage.subjects.find(entry => entry.id === row.classSubjectId);
			const className = classLabel(subject?.classId ?? row.classGroupId);
			return `${className} · ${teachersPage.subjectLabel(row.classSubjectId)}`;
		}
		return classLabel(row.classGroupId);
	}

	async function removeRow(row: components['schemas']['TeacherAssignment']) {
		if (deleteBusy) {
			return;
		}
		deleteBusy = row.id;
		await teachersPage.deleteAssignment({
			id: row.id,
			successMessage: get(t)('teacher.assignmentDeleted'),
		});
		deleteBusy = null;
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between gap-2">
		<div>
			<h4 class="text-sm font-semibold">{$t('teacher.assignmentsTitle')}</h4>
			<p class="text-xs text-muted-foreground">{$t('teacher.assignmentsHint')}</p>
		</div>
		<PermissionGate permission="STAFF_UPDATE" mode="disable">
			{#snippet children({ disabled })}
				<Button size="sm" class="rounded-full" disabled={disabled} onclick={() => (formOpen.open = true)}>
					<Plus class="mr-1.5 h-3.5 w-3.5" />
					{$t('teacher.addAssignment')}
				</Button>
			{/snippet}
		</PermissionGate>
	</div>

	{#if rows.length === 0}
		<p class="text-sm text-muted-foreground">{$t('teacher.noAssignments')}</p>
	{:else}
		<ul class="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
			{#each rows as row (row.id)}
				<li class="flex items-start justify-between gap-3 px-4 py-3">
					<div class="min-w-0 flex-1">
						<div class="text-sm font-medium">
							{$t(`teacher.assignmentKind.${row.kind}`)}
						</div>
						<div class="mt-1 text-xs text-muted-foreground">{targetLabel(row)}</div>
					</div>
					<PermissionGate permission="STAFF_UPDATE" mode="disable">
						{#snippet children({ disabled })}
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
								disabled={disabled || deleteBusy === row.id}
								onclick={() => removeRow(row)}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						{/snippet}
					</PermissionGate>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<TeacherAssignmentFormModal bind:open={formOpen.open} {teacher} />
