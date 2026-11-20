<script lang="ts">
	import type { components } from '$lib/api/schema';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { ArrowLeft, Plus, Trash2 } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { get } from 'svelte/store';
	import { getTeacherAssignmentsPageState } from '../teacher-assignments-page.svelte';
	import TeacherAssignmentHubFormModal from './TeacherAssignmentHubFormModal.svelte';

	const hubPage = getTeacherAssignmentsPageState();
	const toolsHref = appPath('/(app)/configuration/tools');

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	let deleteBusy = $state<string | null>(null);

	const teacherNameById = $derived(
		Object.fromEntries(hubPage.teachers.map(teacher => [teacher.id, teacher.name])),
	);

	const classOptions = $derived(
		academicContext.classes.map(entry => ({ value: entry.id, label: entry.name })),
	);

	const teacherOptions = $derived(
		hubPage.teachers.map(teacher => ({ value: teacher.id, label: teacher.name })),
	);

	const rows = $derived.by(() => {
		const filters = hubPage.filters.values;
		const q = filters.q.trim().toLowerCase();
		return hubPage.assignments
			.filter((row) => {
				if (filters.class !== 'all') {
					const subjectClassId = row.classSubjectId
						? hubPage.classSubjects.find(entry => entry.id === row.classSubjectId)?.classId
						: undefined;
					const rowClassId = subjectClassId ?? row.classGroupId;
					if (rowClassId !== filters.class) {
						return false;
					}
				}
				if (filters.teacher !== 'all' && row.teacherId !== filters.teacher) {
					return false;
				}
				if (!q) {
					return true;
				}
				const teacherName = teacherNameById[row.teacherId] ?? '';
				const target = targetLabel(row);
				return `${teacherName} ${target}`.toLowerCase().includes(q);
			})
			.sort((left, right) => {
				const nameCompare = (teacherNameById[left.teacherId] ?? '').localeCompare(
					teacherNameById[right.teacherId] ?? '',
					'fr',
				);
				if (nameCompare !== 0) {
					return nameCompare;
				}
				return targetLabel(left).localeCompare(targetLabel(right), 'fr');
			});
	});

	$effect(() => {
		const classSubjectIds = hubPage.assignments
			.map(row => row.classSubjectId)
			.filter((id): id is string => Boolean(id));
		if (classSubjectIds.length === 0) {
			return;
		}
		void hubPage.ensureClassSubjectsCached(classSubjectIds);
	});

	function classLabel(classGroupId: string | null | undefined): string {
		if (!classGroupId) {
			return '—';
		}
		return academicContext.classes.find(entry => entry.id === classGroupId)?.name ?? classGroupId;
	}

	function targetLabel(row: components['schemas']['TeacherAssignment']): string {
		if (row.kind === 'subject' && row.classSubjectId) {
			const subject = hubPage.classSubjects.find(entry => entry.id === row.classSubjectId);
			const className = classLabel(subject?.classId ?? row.classGroupId);
			return `${className} · ${hubPage.subjectLabel(row.classSubjectId)}`;
		}
		return classLabel(row.classGroupId);
	}

	function teacherHref(teacherId: string) {
		return appPath('/(app)/school/teachers/[[id]]', { id: teacherId });
	}

	async function removeRow(row: components['schemas']['TeacherAssignment']) {
		if (deleteBusy) {
			return;
		}
		deleteBusy = row.id;
		await hubPage.deleteAssignment({
			id: row.id,
			successMessage: get(t)('teacher.assignmentDeleted'),
		});
		deleteBusy = null;
	}
</script>

<div class="space-y-4">
	<Button
		variant="ghost"
		size="sm"
		class="-ml-2 mb-1"
		onclick={() => void appGoto(toolsHref)}
	>
		<ArrowLeft class="mr-1.5 h-4 w-4" />
		{$t('tools.teacherAssignments.backToTools')}
	</Button>

	<ListPageHeader
		eyebrow={$t('tools.eyebrow')}
		title={$t('tools.teacherAssignments.title')}
		description={$t('tools.teacherAssignments.hint')}
	>
		{#snippet primary()}
			<PermissionGate permission="STAFF_MANAGE" mode="disable">
				{#snippet children({ disabled })}
					<Button disabled={disabled} onclick={() => modals.open('create')}>
						<Plus class="mr-1.5 h-4 w-4" />
						{$t('teacher.addAssignment')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
		<div class="min-w-[12rem] flex-1">
			<ListSearchField
				value={hubPage.filters.values.q}
				placeholder={$t('tools.teacherAssignments.search')}
				oninput={event => hubPage.filters.setField('q', event.currentTarget.value)}
			/>
		</div>
		<FilterSelect
			value={hubPage.filters.values.class}
			onchange={value => hubPage.filters.patchImmediate({ class: value })}
			class="w-full sm:w-44"
			options={[{ value: 'all', label: $t('tools.teacherAssignments.filterAllClasses') }, ...classOptions]}
		/>
		<FilterSelect
			value={hubPage.filters.values.teacher}
			onchange={value => hubPage.filters.patchImmediate({ teacher: value })}
			class="w-full sm:w-52"
			options={[{ value: 'all', label: $t('tools.teacherAssignments.filterAllTeachers') }, ...teacherOptions]}
		/>
	</div>

	{#if rows.length === 0}
		<p class="text-sm text-muted-foreground">{$t('tools.teacherAssignments.noResults')}</p>
	{:else}
		<ul class="divide-y divide-border/60 overflow-hidden rounded-collection border border-border bg-card">
			{#each rows as row (row.id)}
				<li class="flex items-start justify-between gap-3 px-4 py-3">
					<div class="min-w-0 flex-1">
						<a
							href={teacherHref(row.teacherId)}
							class="text-sm font-medium text-foreground hover:text-primary hover:underline"
						>
							{teacherNameById[row.teacherId] ?? row.teacherId}
						</a>
						<div class="mt-0.5 text-xs text-muted-foreground">
							{$t(`teacher.assignmentKind.${row.kind}`)}
						</div>
						<div class="mt-1 text-sm text-foreground/90">{targetLabel(row)}</div>
					</div>
					<PermissionGate permission="STAFF_MANAGE" mode="disable">
						{#snippet children({ disabled })}
							<Button
								variant="ghost"
								size="icon"
								class="w-8 shrink-0 text-muted-foreground hover:text-destructive"
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

<TeacherAssignmentHubFormModal bind:open={createOpen.open} />
