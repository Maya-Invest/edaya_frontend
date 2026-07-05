<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { Incident } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteIncidentMutation } from '$lib/api/mutations/delete-entity.mutations';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { loadIncidentInvolvements, loadIncidentSanctions } from '$lib/api/school-life-data';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { locale, t } from '$lib/i18n';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { incidentSevTone, incidentCatTone } from '../shared/drawer-constants.ts';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import IncidentFormModal from './IncidentFormModal.svelte';
	import IncidentResolveModal from './IncidentResolveModal.svelte';

	type Involvement = components['schemas']['StudentIncidentInvolvement'];

	const { i }: { i: Incident } = $props();

	let resolveOpen = $state(false);
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);
	let involvements = $state<Involvement[]>([]);
	let sanctions = $state<Awaited<ReturnType<typeof loadIncidentSanctions>>>([]);
	let detailLoading = $state(false);

	const students = $derived(detailDataContext.students);
	const isResolved = $derived(i.status === 'resolved');
	$effect(() => {
		const incidentId = i.id;
		const names = new Map(students.map(student => [student.id, student.name]));
		void (async () => {
			detailLoading = true;
			try {
				const client = getBrowserSchoolClient();
				[involvements, sanctions] = await Promise.all([
					loadIncidentInvolvements(client, incidentId),
					loadIncidentSanctions(client, incidentId, names),
				]);
			}
			finally {
				detailLoading = false;
			}
		})();
	});

	function studentFor(studentId: string) {
		return students.find(student => student.id === studentId);
	}

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await deleteIncidentMutation(i.id, {
				successMessage: get(t)('events.toastDeleted'),
			});
			if (ok) {
				deleteOpen = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}

	async function refreshDetail() {
		const client = getBrowserSchoolClient();
		const names = new Map(students.map(student => [student.id, student.name]));
		[involvements, sanctions] = await Promise.all([
			loadIncidentInvolvements(client, i.id),
			loadIncidentSanctions(client, i.id, names),
		]);
	}
</script>

<div class="space-y-5">
	<DrawerEntityHeader name={i.summary} summary={new Date(i.date).toLocaleDateString($locale, { day: 'numeric', month: 'long', year: 'numeric' })}>
		{#snippet chips()}
			<span class={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', incidentSevTone[i.severity])}>
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
		{/snippet}
		{#snippet actions()}
			<PermissionGate permission="DISCIPLINE_UPDATE" mode="disable" tooltip={$t('events.permissionUpdate')}>
				{#snippet children({ disabled, title })}
					<IncidentFormModal
						incident={i}
						students={detailDataContext.students}
						classes={academicContext.classes}
						{disabled}
						{title}
					/>
				{/snippet}
			</PermissionGate>
			{#if !isResolved}
				<PermissionGate permission="DISCIPLINE_UPDATE" mode="disable" tooltip={$t('events.permissionUpdate')}>
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
		{/snippet}
		{#snippet overflow()}
			<PermissionGate permission="DISCIPLINE_UPDATE" mode="disable" tooltip={$t('events.permissionUpdate')}>
				{#snippet children({ disabled, title })}
					<RowActionMenuItem
						{disabled}
						{title}
						destructive
						onclick={() => (deleteOpen = true)}
					>
						{$t('common.delete')}
					</RowActionMenuItem>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	<DrawerField label={$t('events.involvedStudents')}>
		{#if detailLoading}
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

	{#if isResolved}
		<DrawerField label={$t('events.appliedSanctions')}>
			{#if detailLoading}
				<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
			{:else if sanctions.length === 0}
				<p class="text-sm text-muted-foreground">{$t('events.noSanctions')}</p>
			{:else}
				<ul class="space-y-2">
					{#each sanctions as sanction (sanction.id)}
						<li class="rounded-xl border border-border bg-secondary/20 px-3 py-2.5">
							<div class="flex items-start justify-between gap-3">
								<div>
									<p class="text-sm font-medium">{sanction.actionName}</p>
									<p class="text-xs text-muted-foreground">{sanction.studentName}</p>
								</div>
								<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
									{$t(`events.sanctionStatus.${sanction.status}`)}
								</span>
							</div>
							{#if sanction.notes}
								<p class="mt-1 text-xs text-muted-foreground">{sanction.notes}</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</DrawerField>
	{/if}

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
</div>

<IncidentResolveModal
	incident={i}
	students={detailDataContext.students}
	classes={academicContext.classes}
	bind:open={resolveOpen}
	onResolved={refreshDetail}
/>

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('events.deleteConfirm', { title: i.summary })}
	confirmLabel={$t('common.delete')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
