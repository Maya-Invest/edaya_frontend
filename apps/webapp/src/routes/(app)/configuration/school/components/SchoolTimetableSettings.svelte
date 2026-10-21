<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import { getSchoolPageState } from '../school-page.svelte';

	const owner = getSchoolPageState();
	const flags = ['enforceScheduleConflicts', 'timetableEnforceWorkloadFulfillment', 'timetableExcludeBreakSlots', 'timetableAllowUnassignedTeacherPlacements', 'timetableUseHomeroomTeacherFallback'] as const;
	const numbers = ['timetableMinDayGapSameSubject', 'timetableMinPeriodSpan', 'timetableMaxPeriodSpan'] as const;
	const modals = createUrlSyncedModals({ allowed: ['timetable-settings'], getUrl: () => $page.url });
	const modal = bindUrlModal(modals, 'timetable-settings');
	const booleans = $state<Record<typeof flags[number], boolean>>({ enforceScheduleConflicts: false, timetableEnforceWorkloadFulfillment: true, timetableExcludeBreakSlots: true, timetableAllowUnassignedTeacherPlacements: false, timetableUseHomeroomTeacherFallback: false });
	const numeric = $state({ timetableMinDayGapSameSubject: 1, timetableMinPeriodSpan: 1, timetableMaxPeriodSpan: 1 });
	let mode = $state<'weekly' | 'free'>('weekly');
	let preferred = $state<string[]>([]);
	let initialized = $state(false);
	let busy = $state(false);
	$effect(() => modals.hydrate());
	$effect(() => {
		if (modal.open && !initialized && owner.raw) {
			initialized = true;
			for (const key of flags)
				booleans[key] = owner.raw[key];
			for (const key of numbers)
				numeric[key] = owner.raw[key];
			mode = owner.raw.timetableGenerationMode;
			preferred = [...owner.raw.timetablePreferredPeriodDefinitionIds];
		}
		if (!modal.open)
			initialized = false;
	});
	const valid = $derived(numbers.every(key => Number.isInteger(numeric[key]) && numeric[key] >= (key === 'timetableMinDayGapSameSubject' ? 0 : 1)) && numeric.timetableMaxPeriodSpan >= numeric.timetableMinPeriodSpan);
	async function save() {
		if (!valid || !hasPermission('SCHOOL_LIFECYCLE_MANAGE'))
			return;
		busy = true;
		try {
			if (await owner.updateSettings({ ...booleans, ...numeric, timetableGenerationMode: mode, timetablePreferredPeriodDefinitionIds: preferred }))
				modals.close();
		}
		finally {
			busy = false;
		}
	}
</script>
<section class="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
	<div class="flex items-center justify-between gap-3"><h2 class="font-display text-lg font-semibold">{$t('profile.timetableSettings')}</h2>{#if hasPermission('SCHOOL_LIFECYCLE_MANAGE')}<Button variant="outline" size="sm" onclick={() => modals.open('timetable-settings')}>{$t('common.edit')}</Button>{/if}</div>
	<dl class="grid gap-3 sm:grid-cols-2">{#each flags as key (key)}<div><dt class="text-xs text-muted-foreground">{$t(`profile.school.${key}`)}</dt><dd>{$t(owner.raw?.[key] ? 'common.yes' : 'common.no')}</dd></div>{/each}{#each numbers as key (key)}<div><dt class="text-xs text-muted-foreground">{$t(`profile.school.${key}`)}</dt><dd>{owner.raw?.[key] ?? '—'}</dd></div>{/each}<div><dt>{$t('profile.generationMode')}</dt><dd>{$t(`profile.generation.${owner.raw?.timetableGenerationMode ?? 'weekly'}`)}</dd></div><div><dt>{$t('profile.preferredPeriods')}</dt><dd>{owner.raw?.timetablePreferredPeriodDefinitionIds.length ?? 0}</dd></div></dl>
</section>
<FormModal bind:open={modal.open} title={$t('profile.timetableSettings')} submitLabel={$t('common.save')} {busy} submitDisabled={!valid} onSubmit={save}>
	{#each flags as key (key)}<label class="flex items-center gap-2"><input type="checkbox" bind:checked={booleans[key]} />{$t(`profile.school.${key}`)}</label>{/each}
	{#each numbers as key (key)}<label class="block">{$t(`profile.school.${key}`)}<input type="number" min={key === 'timetableMinDayGapSameSubject' ? 0 : 1} step="1" bind:value={numeric[key]} class="h-10 w-full rounded-lg border bg-background px-3" /></label>{/each}
	<label>{$t('profile.generationMode')}<select bind:value={mode} class="h-10 w-full rounded-lg border bg-background px-3"><option value="weekly">{$t('profile.generation.weekly')}</option><option value="free">{$t('profile.generation.free')}</option></select></label>
	{#if modal.open}<PageQuery cache={false} query={owner.periodChoicesQuery} cacheKey={() => owner.raw?.id ?? ''} loadingTitle={$t('profile.preferredPeriods')}>
		{#snippet children(data)}{#if data.status === 'error'}<p role="alert">{data.errorMessage}</p>{:else}<fieldset class="space-y-2"><legend>{$t('profile.preferredPeriods')}</legend><Button variant="ghost" size="sm" onclick={() => preferred = []}>{$t('profile.clearPreferredPeriods')}</Button>{#each owner.periodChoices as period (period.id)}<label class="flex items-center gap-2"><input type="checkbox" bind:group={preferred} value={period.id} />{period.label}</label>{/each}{#if preferred.some(id => !owner.periodChoices.some(row => row.id === id))}<p class="text-xs text-muted-foreground">{$t('profile.previousPeriodsPreserved')}</p>{/if}</fieldset>{/if}{/snippet}
	</PageQuery>{/if}
</FormModal>
