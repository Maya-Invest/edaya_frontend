<script lang="ts">
	import type { SubjectSelection } from '$lib/subjects/subject-selection';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { civilDateTimeInTimeZoneToIso, isoToZonedDateAndTime } from '$lib/date/format';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { hasPermission } from '$lib/permissions';
	import { bulkParticipationCandidates, bulkParticipationOperations, commonSelection } from '$lib/subjects/bulk-participation';
	import { selectionChanged } from '$lib/subjects/subject-selection';
	import SubjectSelectionFields from '$lib/subjects/SubjectSelectionFields.svelte';
	import { SubjectStudentsState } from './subject-students.svelte';

	const participationState = new SubjectStudentsState();
	registerVersionInvalidation(participationState);
	const id = $derived($page.params.id ?? '');
	const query = $derived(participationState.query(id));
	const zone = $derived(academicContext.schools.find(s => s.id === academicContext.schoolScopeId)?.timeZone ?? 'UTC');
	const modals = createUrlSyncedModals({ allowed: ['subject-roster'], getUrl: () => $page.url });
	let selected = $state<string[]>([]);
	let selection = $state<SubjectSelection>({ scope: 'none' });
	let explicitChoice = $state(false);
	let mixed = $state(false);
	let busy = $state(false);
	let initializedModal = '';
	let initializedSelection = '';
	const candidates = $derived(bulkParticipationCandidates(participationState.placements));
	const changed = $derived(selected.some(placementId => selectionChanged(selection, participationState.intervals.find(row => row.studentClassEnrollmentId === placementId))));
	$effect(() => modals.hydrate());
	$effect(() => {
		const key = `${id}:${modals.active ?? ''}`;
		if (key === initializedModal)
			return;
		initializedModal = key;
		selected = [];
		explicitChoice = false;
		participationState.captureRevision();
	});
	$effect(() => {
		const key = `${id}:${modals.active ?? ''}:${selected.join(',')}`;
		if (key === initializedSelection)
			return;
		initializedSelection = key;
		const common = commonSelection(selected, participationState.intervals);
		mixed = selected.length > 0 && common === null;
		selection = common ?? { scope: 'none' };
		explicitChoice = false;
	});
	async function changeDate(value: string) {
		const url = new URL($page.url);
		url.searchParams.set('rosterAt', civilDateTimeInTimeZoneToIso(value, '00:00', zone));
		await appGoto(`${url.pathname}${url.search}`, { noScroll: true, keepFocus: true });
	}
	async function save() {
		if (mixed && !explicitChoice)
			return;
		const operations = bulkParticipationOperations({ placements: participationState.placements, selected, classSubjectId: id, selection });
		busy = true;
		try {
			if (await participationState.save(operations))
				modals.close();
		}
		finally { busy = false; }
	}
</script>
<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('participation.students')}>
	{#snippet children(data)}
		<DataState status={data.status} errorMessage={data.errorMessage}>
			<div class="space-y-4">
				<label>{$t('participation.asOf')}<Input type="date" value={isoToZonedDateAndTime($page.url.searchParams.get('rosterAt') ?? new Date().toISOString(), zone).date} onchange={event => changeDate(event.currentTarget.value)} /></label>
				{#if participationState.roster?.basis === 'unavailable'}
					<p class="text-sm text-muted-foreground">{$t('participation.historicalUnavailable')}</p>
				{:else}
					<p class="font-semibold">{$t('participation.students')} · {participationState.roster?.count ?? 0}</p>
					{#each participationState.roster?.students ?? [] as student (student.id)}<p class="rounded-lg border p-3">{student.lastName} {student.firstName}</p>{/each}
				{/if}
				{#if participationState.optional && hasPermission('ENROLLMENT_MANAGE', { classId: $page.params.classId })}<Button onclick={() => modals.open('subject-roster')}>{$t('participation.bulk')}</Button>{/if}
			</div>
		</DataState>
	{/snippet}
</PageQuery>
<FormModal open={modals.active === 'subject-roster' && participationState.optional && hasPermission('ENROLLMENT_MANAGE', { classId: $page.params.classId })} onOpenChange={(value) => {
	if (!value)
		modals.close();
}} title={$t('participation.bulk')} cancelLabel={$t('common.cancel')} submitLabel={$t(selection.scope === 'none' ? 'participation.withdraw' : 'common.save')} {busy} submitDisabled={!selected.length || !changed || (mixed && !explicitChoice)} onSubmit={save}>
	<p class="font-medium">{$t('participation.selectStudents')} · {selected.length}</p>
	{#each candidates as placement (placement.id)}
		{@const student = participationState.students.find(row => row.id === placement.studentId)}
		<label class="flex min-h-11 items-center gap-3"><Checkbox checked={selected.includes(placement.id)} onCheckedChange={checked => selected = checked ? [...selected, placement.id] : selected.filter(id => id !== placement.id)} />{student?.lastName} {student?.firstName}</label>
	{/each}
	{#if mixed}<p class="text-sm text-muted-foreground">{$t('participation.mixedSelections')}</p>{/if}
	<SubjectSelectionFields bind:selection periods={participationState.roster?.periods ?? []} {zone} onChange={() => explicitChoice = true} />
</FormModal>
