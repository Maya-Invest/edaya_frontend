<script lang="ts">
	import type { Incident } from '$lib/types/school';
	import { page } from '$app/stores';
	import { incidentSevTone, incidentCatTone } from '$lib/components/school/shared/drawer-constants';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { locale, t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import IncidentFormModal from '../../components/IncidentFormModal.svelte';
	import { getEventsPageState } from '../../events-page.svelte';
	import IncidentResolveModal from './IncidentResolveModal.svelte';

	type IncidentDrawerModal = 'edit' | 'resolve' | 'delete';

	const {
		incident,
		onDeleted,
	}: {
		incident: Incident;
		onDeleted?: () => void;
	} = $props();

	const eventsPage = getEventsPageState();
	const students = $derived(eventsPage.students);

	const modals = createUrlSyncedModals<IncidentDrawerModal>({
		allowed: ['edit', 'resolve', 'delete'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');
	const resolveOpen = bindUrlModal(modals, 'resolve');
	const deleteOpen = bindUrlModal(modals, 'delete');

	let deleteBusy = $state(false);
	const involvements = $derived(eventsPage.involvements);
	const sanctions = $derived(eventsPage.sanctions);
	const detailLoading = $derived(eventsPage.detailLoading);
	const live = $derived(eventsPage.findIncident(incident.id) ?? incident);
	const isResolved = $derived(live.status === 'resolved');

	function studentFor(studentId: string) {
		return students.find(student => student.id === studentId);
	}

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await eventsPage.deleteIncident(live.id, {
				successMessage: get(t)('events.toastDeleted'),
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

	const refreshDetail = () => eventsPage.refreshDetail(live.id);

</script>

<div class="space-y-5">
	<DrawerEntityHeader name={live.summary} summary={new Date(live.date).toLocaleDateString($locale, { day: 'numeric', month: 'long', year: 'numeric' })}>
		{#snippet chips()}
			<span class={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', incidentSevTone[live.severity])}>
				{$t(`events.severity.${live.severity}`)}
			</span>
			<span class={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', incidentCatTone[live.category])}>
				{$t(`events.cat.${live.category}`)}
			</span>
			{#if isResolved}
				<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/70">
					{$t('events.status.resolved')}
				</span>
			{/if}
		{/snippet}
		{#snippet actions()}
			<PermissionGate permission="DISCIPLINE_MANAGE" mode="disable" tooltip={$t('events.permissionUpdate')}>
				{#snippet children({ disabled, title })}
					<IncidentFormModal
						incident={live}
						{disabled}
						{title}
						bind:open={editOpen.open}
					/>
				{/snippet}
			</PermissionGate>
			{#if !isResolved}
				<PermissionGate permission="DISCIPLINE_VALIDATE"><Button variant="outline" size="sm" onclick={async () => {
					try {
						await eventsPage.takeOverIncident(live.id);
						toast.success($t('corrections.takeOver'));
					}
					catch (error) { toast.error(error instanceof Error ? error.message : $t('corrections.error')); }
				}}>{$t('corrections.takeOver')}</Button></PermissionGate>
				<PermissionGate permission="DISCIPLINE_VALIDATE" mode="disable" tooltip={$t('events.permissionValidate')}>
					{#snippet children({ disabled, title })}
						<Button
							variant="outline"
							size="sm"
							class="rounded-full"
							{disabled}
							{title}
							onclick={() => modals.open('resolve')}
						>
							{$t('events.resolveAction')}
						</Button>
					{/snippet}
				</PermissionGate>
			{/if}
		{/snippet}
		{#snippet overflow()}
			<PermissionGate permission="DISCIPLINE_MANAGE" mode="disable" tooltip={$t('events.permissionArchive')}>
				{#snippet children({ disabled, title })}
					<RowActionMenuItem
						{disabled}
						{title}
						destructive
						onclick={() => (deleteOpen.open = true)}
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
			{live.summary}
		</div>
	</DrawerField>
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('events.date')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{live.date}</div>
		</DrawerField>
		<DrawerField label={$t('events.category')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{$t(`events.cat.${live.category}`)}
			</div>
		</DrawerField>
	</div>
	<DrawerField label={$t('events.severity')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
			{$t(`events.severity.${live.severity}`)}
		</div>
	</DrawerField>
</div>

<IncidentResolveModal
	incident={live}
	bind:open={resolveOpen.open}
	onResolved={refreshDetail}
/>

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('events.deleteConfirm', { title: live.summary })}
	confirmLabel={$t('common.delete')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
