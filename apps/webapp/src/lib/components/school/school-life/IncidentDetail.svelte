<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { Incident } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteIncidentMutation } from '$lib/api/mutations/delete-entity.mutations';
	import { loadIncidentInvolvements } from '$lib/api/school-life-data';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import Button from '$lib/components/ui/button/button.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { locale, t } from '$lib/i18n';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { incidentSevTone, incidentCatTone } from '../shared/drawer-constants.ts';
	import DrawerActionBar from '../shared/DrawerActionBar.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import IncidentFormModal from './IncidentFormModal.svelte';
	import IncidentResolveModal from './IncidentResolveModal.svelte';

	type Involvement = components['schemas']['StudentIncidentInvolvement'];

	const { i }: { i: Incident } = $props();

	let resolveOpen = $state(false);
	let involvements = $state<Involvement[]>([]);
	let involvementsLoading = $state(false);

	const students = $derived(detailDataContext.students);
	const classes = $derived(academicContext.classes);
	const isResolved = $derived(i.status === 'resolved');
	const primaryStudent = $derived(students.find(student => student.id === i.studentId));
	const primaryClass = $derived(academicContext.classes.find(entry => entry.id === primaryStudent?.classId));

	$effect(() => {
		const incidentId = i.id;
		void (async () => {
			involvementsLoading = true;
			try {
				involvements = await loadIncidentInvolvements(getBrowserSchoolClient(), incidentId);
			}
			finally {
				involvementsLoading = false;
			}
		})();
	});

	function studentFor(studentId: string) {
		return students.find(student => student.id === studentId);
	}
</script>

<div class="space-y-5">
	<div>
		<div class="flex flex-wrap items-center gap-2">
			<span
				class={cn(
					'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
					incidentSevTone[i.severity],
				)}
			>
				{$t(`events.severity.${i.severity}`)}
			</span>
			<span class={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', incidentCatTone[i.category])}>
				{$t(`events.cat.${i.category}`)}
			</span>
			{#if isResolved}
				<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/70">
					{$t('events.status.resolved')}
				</span>
			{/if}
		</div>
		<h3 class="mt-2 font-display text-2xl font-semibold leading-tight">{i.summary}</h3>
		<p class="mt-1 font-mono text-xs text-muted-foreground">
			{new Date(i.date).toLocaleDateString($locale, { day: 'numeric', month: 'long', year: 'numeric' })}
		</p>
	</div>

	{#if primaryStudent}
		<div class="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground"
			>
				{primaryStudent.initials}
			</div>
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium">{primaryStudent.name}</p>
				<p class="truncate text-xs text-muted-foreground">{primaryClass?.name} · {primaryClass?.level}</p>
			</div>
		</div>
	{/if}

	<DrawerField label={$t('events.involvedStudents')}>
		{#if involvementsLoading}
			<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
		{:else if involvements.length === 0}
			<p class="text-sm text-muted-foreground">{$t('events.noInvolvedStudents')}</p>
		{:else}
			<ul class="space-y-2">
				{#each involvements as involvement (involvement.id)}
					{@const student = studentFor(involvement.studentId)}
					<li class="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-2">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{student?.name ?? involvement.studentId}</p>
							<p class="text-xs text-muted-foreground">{$t(`events.role.${involvement.role}`)}</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</DrawerField>

	<DrawerField label={$t('events.summary')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm whitespace-pre-wrap">
			{i.summary}
		</div>
	</DrawerField>
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('events.date')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{i.date}</div>
		</DrawerField>
		<DrawerField label={$t('events.category')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{$t(`events.cat.${i.category}`)}
			</div>
		</DrawerField>
	</div>
	<DrawerField label={$t('events.severity')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
			{$t(`events.severity.${i.severity}`)}
		</div>
	</DrawerField>

	<DrawerActionBar>
		<PermissionGate
			permission="DISCIPLINE_UPDATE"
			mode="disable"
			tooltip={$t('events.permissionUpdate')}
		>
			{#snippet children({ disabled, title })}
				<IncidentFormModal
					incident={i}
					students={detailDataContext.students}
					classes={academicContext.classes}
					{disabled}
					title={title}
				/>
			{/snippet}
		</PermissionGate>
		{#if !isResolved}
			<PermissionGate
				permission="DISCIPLINE_UPDATE"
				mode="disable"
				tooltip={$t('events.permissionUpdate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						variant="outline"
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (resolveOpen = true)}
					>
						{$t('events.resolveAction')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/if}
		<PermissionGate
			permission="DISCIPLINE_UPDATE"
			mode="disable"
			tooltip={$t('events.permissionUpdate')}
		>
			{#snippet children({ disabled, title })}
				<DeleteEntityButton
					{disabled}
					{title}
					confirmTitle={$t('common.deleteConfirmTitle')}
					confirmDescription={$t('events.deleteConfirm', { title: i.summary })}
					onConfirm={() => deleteIncidentMutation(i.id, {
						successMessage: get(t)('events.toastDeleted'),
					})}
				/>
			{/snippet}
		</PermissionGate>
	</DrawerActionBar>
</div>

<IncidentResolveModal
	incident={i}
	students={detailDataContext.students}
	classes={academicContext.classes}
	bind:open={resolveOpen}
	onResolved={() => {
		void loadIncidentInvolvements(getBrowserSchoolClient(), i.id).then((entries) => {
			involvements = entries;
		});
	}}
/>
