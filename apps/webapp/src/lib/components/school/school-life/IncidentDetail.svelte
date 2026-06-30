<script lang="ts">
	import type { Incident } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteIncidentMutation } from '$lib/api/mutations/delete-entity.mutations';
	import { resolveIncidentMutation } from '$lib/api/mutations/incident.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { locale, t } from '$lib/i18n';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { incidentSevTone, incidentCatTone } from '../shared/drawer-constants.ts';
	import DrawerActionBar from '../shared/DrawerActionBar.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import IncidentFormModal from './IncidentFormModal.svelte';

	const { i }: { i: Incident } = $props();

	let resolveOpen = $state(false);
	let resolveBusy = $state(false);
	let resolutionNotes = $state('');

	const student = $derived(detailDataContext.students.find(s => s.id === i.studentId));
	const cls = $derived(academicContext.classes.find(c => c.id === student?.classId));

	async function submitResolve() {
		resolveBusy = true;
		try {
			const ok = await resolveIncidentMutation({
				incidentId: i.id,
				resolutionNotes,
				successMessage: get(t)('events.resolveSuccess'),
			});
			if (ok) {
				resolveOpen = false;
				resolutionNotes = '';
			}
		}
		finally {
			resolveBusy = false;
		}
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
		</div>
		<h3 class="mt-2 font-display text-2xl font-semibold leading-tight">{i.summary}</h3>
		<p class="mt-1 font-mono text-xs text-muted-foreground">
			{new Date(i.date).toLocaleDateString($locale, { day: 'numeric', month: 'long', year: 'numeric' })}
		</p>
	</div>

	{#if student}
		<div class="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground"
			>
				{student.initials}
			</div>
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium">{student.name}</p>
				<p class="truncate text-xs text-muted-foreground">{cls?.name} · {cls?.level}</p>
			</div>
		</div>
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

<FormModal
	bind:open={resolveOpen}
	title={$t('events.resolveTitle')}
	description={$t('events.resolveDescription')}
	submitLabel={$t('events.resolveAction')}
	busy={resolveBusy}
	onSubmit={submitResolve}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('events.resolveNotes')}
		</Label>
		<Textarea bind:value={resolutionNotes} rows={4} />
	</div>
</FormModal>
