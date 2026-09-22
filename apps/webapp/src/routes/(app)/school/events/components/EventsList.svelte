<script lang="ts">
	import type { Incident } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { AlertTriangle, Plus } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { cn } from '$lib/utils';
	import { getEventsPageState } from '../events-page.svelte';
	import IncidentFormModal from './IncidentFormModal.svelte';

	const {
		classId,
		onSelect,
		selectedId,
	}: {
		classId?: string;
		onSelect?: (i: Incident) => void;
		selectedId?: string;
	} = $props();

	const eventsPage = getEventsPageState();
	const incidents = $derived(eventsPage.incidents);
	const students = $derived(eventsPage.students);
	const classes = $derived(academicContext.classes);

	const sevTone: Record<Incident['severity'], string> = {
		low: 'bg-secondary text-foreground/70',
		medium: 'bg-highlight-soft text-highlight',
		high: 'bg-destructive/10 text-destructive',
	};

	const catTone: Record<Incident['category'], string> = {
		Behavior: 'bg-highlight-soft text-highlight',
		Tardiness: 'bg-secondary text-foreground/70',
		Conflict: 'bg-destructive/10 text-destructive',
		Other: 'bg-secondary text-foreground/80',
	};

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const list = $derived.by(() => {
		let filtered = incidents;
		const filters = eventsPage.filters.values;

		const effectiveClassId = classId || (filters.class !== 'all' ? filters.class : undefined);
		if (effectiveClassId) {
			const sIds = new Set(
				students.filter(s => s.classId === effectiveClassId).map(s => s.id),
			);
			filtered = filtered.filter(i =>
				i.involvedStudentIds.length === 0
				|| i.involvedStudentIds.some(id => sIds.has(id)),
			);
		}

		if (filters.q.trim()) {
			const q = filters.q.toLowerCase();
			filtered = filtered.filter((i) => {
				return i.involvedStudentIds.some((studentId) => {
					const st = students.find(s => s.id === studentId);
					return st?.name.toLowerCase().includes(q) ?? false;
				}) || i.summary.toLowerCase().includes(q);
			});
		}

		if (filters.category !== 'all') {
			filtered = filtered.filter(i => i.category === filters.category);
		}
		if (filters.severity !== 'all') {
			filtered = filtered.filter(i => i.severity === filters.severity);
		}
		if (filters.status !== 'all') {
			filtered = filtered.filter(i => i.status === filters.status);
		}

		return filtered;
	});

	const classFilterOptions = $derived([
		{ value: 'all', label: $t('common.allClasses') },
		...classes.map(c => ({ value: c.id, label: c.name })),
	]);

	const categoryOptions = $derived([
		{ value: 'all', label: $t('filter.all') },
		{ value: 'Behavior', label: $t('events.cat.Behavior') },
		{ value: 'Tardiness', label: $t('events.cat.Tardiness') },
		{ value: 'Conflict', label: $t('events.cat.Conflict') },
		{ value: 'Other', label: $t('events.cat.Other') },
	] as const);

	const severityOptions = $derived([
		{ value: 'all', label: $t('filter.all') },
		{ value: 'low', label: $t('events.severity.low') },
		{ value: 'medium', label: $t('events.severity.medium') },
		{ value: 'high', label: $t('events.severity.high') },
	] as const);

	const statusOptions = $derived([
		{ value: 'all', label: $t('filter.all') },
		{ value: 'open', label: $t('events.status.open') },
		{ value: 'resolved', label: $t('events.status.resolved') },
		{ value: 'cancelled', label: $t('events.status.cancelled') },
	] as const);

	const secondaryFilterCount = $derived(
		[
			eventsPage.filters.values.category,
			eventsPage.filters.values.severity,
			eventsPage.filters.values.status,
		].filter(value => value !== 'all').length,
	);

	function studentSummary(incident: Incident): string {
		const primary = students.find(student => student.id === incident.studentId);
		if (!primary) {
			return incident.involvedCount > 1
				? $t('events.multiStudentCount', { count: incident.involvedCount })
				: '—';
		}
		if (incident.involvedCount <= 1) {
			return primary.name;
		}
		return $t('events.multiStudentSummary', {
			name: primary.name,
			count: incident.involvedCount - 1,
		});
	}

	function handleCreated(incidentId: string) {
		openDetailDrawer(detailHref.schoolIncident(incidentId), currentRouteSurfaceHref($page.url));
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('events.schoolLife')}
		title={$t('events.count', { n: list.length })}
	>
		{#snippet search()}
			<ListSearchField
				value={eventsPage.filters.values.q}
				placeholder={$t('common.searchStudent')}
				class="min-w-[200px] max-w-sm"
				oninput={event => eventsPage.filters.setField('q', event.currentTarget.value)}
			/>
		{/snippet}
		{#snippet filters()}
			{#if !classId}
				<FilterSelect
					value={eventsPage.filters.values.class}
					onchange={value => eventsPage.filters.patchImmediate({ class: value })}
					class="h-9 w-[220px] rounded-lg text-sm"
					options={classFilterOptions}
				/>
			{/if}
			<FilterPanel activeCount={secondaryFilterCount} title={$t('events.secondaryFilters')}>
				<div class="space-y-3">
					<FilterSelect
						value={eventsPage.filters.values.category}
						onchange={value => eventsPage.filters.patchImmediate({ category: value })}
						class="h-9 w-full rounded-md text-xs"
						options={[...categoryOptions]}
					/>
					<FilterSelect
						value={eventsPage.filters.values.severity}
						onchange={value => eventsPage.filters.patchImmediate({ severity: value })}
						class="h-9 w-full rounded-md text-xs"
						options={[...severityOptions]}
					/>
					<FilterSelect
						value={eventsPage.filters.values.status}
						onchange={value => eventsPage.filters.patchImmediate({ status: value })}
						class="h-9 w-full rounded-md text-xs"
						options={[...statusOptions]}
					/>
				</div>
			</FilterPanel>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="DISCIPLINE_CREATE"
				mode="disable"
				tooltip={$t('events.permissionCreate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('events.log')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'incidents.csv',
					headers: ['date', 'student', 'category', 'severity', 'summary'],
					loadAll: async () => list.map(incident => [
						incident.date,
						studentSummary(incident),
						incident.category,
						incident.severity,
						incident.summary,
					]),
				})}
			/>
		{/snippet}
	</ListPageHeader>

	<IncidentFormModal
		bind:open={createOpen.open}
		onCreated={handleCreated}
	/>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-2">{$t('events.date')}</div>
			<div class="col-span-3">{$t('events.student')}</div>
			<div class="col-span-2">{$t('events.category')}</div>
			<div class="col-span-1">{$t('events.severity')}</div>
			<div class="col-span-4">{$t('events.summary')}</div>
		</div>
		<ul>
			{#each list as i (i.id)}
				{@const st = students.find(s => s.id === i.studentId)}
				{@const cls = classes.find(c => c.id === st?.classId)}
				<li>
					<button
						type="button"
						onclick={() => onSelect?.(i)}
						class={cn(
							'grid w-full grid-cols-12 gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-secondary',
							selectedId === i.id && 'border-primary/40 bg-primary/5',
						)}
					>
						<div class="col-span-2 font-sans tabular-nums text-xs text-muted-foreground">
							{new Date(i.date).toLocaleDateString($locale, {
								day: 'numeric',
								month: 'short',
								year: 'numeric',
							})}
						</div>
						<div class="col-span-3 flex items-center gap-2">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-xs font-semibold text-primary-foreground"
							>
								{st?.initials ?? '?'}
							</div>
							<div>
								<p class="text-sm font-medium">{studentSummary(i)}</p>
								<p class="text-[10px] text-muted-foreground">{cls?.name ?? '—'}</p>
							</div>
						</div>
						<div class="col-span-2">
							<span
								class={cn(
									'rounded-full px-2 py-0.5 text-[10px] font-medium',
									catTone[i.category],
								)}
							>
								{$t(`events.cat.${i.category}`)}
							</span>
						</div>
						<div class="col-span-1">
							<span
								class={cn(
									'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
									sevTone[i.severity],
								)}
							>
								{$t(`events.severity.${i.severity}`)}
							</span>
						</div>
						<div class="col-span-4 flex items-center gap-2 text-sm text-foreground/80">
							<AlertTriangle class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
							{i.summary}
						</div>
					</button>
				</li>
			{/each}
			{#if list.length === 0}
				<li class="px-5 py-12 text-center text-sm text-muted-foreground">{$t('events.none')}</li>
			{/if}
		</ul>
	</div>
</div>
