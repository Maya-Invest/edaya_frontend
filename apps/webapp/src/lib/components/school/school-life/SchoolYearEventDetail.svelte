<script lang="ts">
	import type { SchoolYearEvent } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteSchoolYearEventMutation } from '$lib/api/mutations/delete-entity.mutations';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import DrawerActionBar from '../shared/DrawerActionBar.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import SchoolYearEventFormModal from './SchoolYearEventFormModal.svelte';

	const { ev }: { ev: SchoolYearEvent } = $props();

	const calTypeKey: Record<SchoolYearEvent['type'], string> = {
		holiday: 'calType.holiday',
		vacation: 'calType.vacation',
		closure: 'calType.closure',
		ceremony: 'calType.ceremony',
	};

	const scopeText = $derived(
		ev.scope === 'all'
			? $t('cal.scopeAll')
			: ev.scope.map(id => academicContext.classes.find(c => c.id === id)?.name ?? id).join(', '),
	);
</script>

<div class="space-y-5">
	<div>
		<span
			class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			{$t(calTypeKey[ev.type])}
		</span>
		<h3 class="mt-2 font-display text-2xl font-semibold">{ev.title}</h3>
		<p class="mt-1 font-mono text-xs text-muted-foreground">
			{new Date(ev.date).toLocaleDateString($locale, { day: 'numeric', month: 'long', year: 'numeric' })}
			{#if ev.endDate}
				— {new Date(ev.endDate).toLocaleDateString($locale, {
					day: 'numeric',
					month: 'long',
					year: 'numeric',
				})}
			{/if}
		</p>
	</div>

	<DrawerField label={$t('drawer.title')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{ev.title}</div>
	</DrawerField>
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('drawer.start')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{ev.date}</div>
		</DrawerField>
		<DrawerField label={$t('drawer.end')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{ev.endDate ?? ev.date}
			</div>
		</DrawerField>
	</div>
	<DrawerField label={$t('cal.typeLabel')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
			{$t(calTypeKey[ev.type])}
		</div>
	</DrawerField>
	<DrawerField label={$t('cal.scopeLabel')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
			{scopeText}
		</div>
	</DrawerField>
	<DrawerField label={$t('drawer.notes')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm whitespace-pre-wrap">
			{ev.description}
		</div>
	</DrawerField>

	<DrawerActionBar>
		<PermissionGate
			permission="TIMETABLE_UPDATE"
			mode="disable"
			tooltip={$t('calendar.permissionUpdate')}
		>
			{#snippet children({ disabled, title })}
				<SchoolYearEventFormModal event={ev} {disabled} {title} />
			{/snippet}
		</PermissionGate>
		<PermissionGate
			permission="TIMETABLE_UPDATE"
			mode="disable"
			tooltip={$t('calendar.permissionUpdate')}
		>
			{#snippet children({ disabled, title })}
				<DeleteEntityButton
					{disabled}
					{title}
					confirmTitle={$t('common.deleteConfirmTitle')}
					confirmDescription={$t('cal.deleteConfirm', { title: ev.title })}
					onConfirm={() => deleteSchoolYearEventMutation(ev, {
						successMessage: get(t)('cal.toastDeleted', { title: ev.title }),
					})}
				/>
			{/snippet}
		</PermissionGate>
	</DrawerActionBar>
</div>
