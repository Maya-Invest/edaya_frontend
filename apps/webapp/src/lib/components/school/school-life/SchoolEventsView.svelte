<script lang="ts">
	import type { Incident } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { AlertTriangle, Plus, Search } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
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

	const incidents = $derived(detailDataContext.incidents);
	const students = $derived(detailDataContext.students);
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

	let classFilter = $state('all');
	let searchQuery = $state('');
	let categoryFilter = $state<'all' | Incident['category']>('all');
	let severityFilter = $state<'all' | Incident['severity']>('all');
	let statusFilter = $state<'all' | Incident['status']>('all');

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	$effect.pre(() => {
		if (classId)
			classFilter = classId;
	});

	const list = $derived.by(() => {
		let filtered = incidents;

		const effectiveClassId = classId || (classFilter !== 'all' ? classFilter : undefined);
		if (effectiveClassId) {
			const sIds = new Set(
				students.filter(s => s.classId === effectiveClassId).map(s => s.id),
			);
			filtered = filtered.filter(i => i.involvedStudentIds.some(id => sIds.has(id)));
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			filtered = filtered.filter((i) => {
				return i.involvedStudentIds.some((studentId) => {
					const st = students.find(s => s.id === studentId);
					return st?.name.toLowerCase().includes(q) ?? false;
				}) || i.summary.toLowerCase().includes(q);
			});
		}

		if (categoryFilter !== 'all') {
			filtered = filtered.filter(i => i.category === categoryFilter);
		}
		if (severityFilter !== 'all') {
			filtered = filtered.filter(i => i.severity === severityFilter);
		}
		if (statusFilter !== 'all') {
			filtered = filtered.filter(i => i.status === statusFilter);
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
		(categoryFilter !== 'all' ? 1 : 0)
			+ (severityFilter !== 'all' ? 1 : 0)
			+ (statusFilter !== 'all' ? 1 : 0),
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
		appGoto(detailHref.schoolIncident(incidentId));
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('events.schoolLife')}
		title={$t('events.count', { n: list.length })}
	>
		{#snippet search()}
			<div class="relative min-w-[200px] max-w-sm">
				<Search
					class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					placeholder={$t('common.searchStudent')}
					bind:value={searchQuery}
					class="h-9 rounded-lg pl-9 text-sm"
				/>
			</div>
		{/snippet}
		{#snippet filters()}
			{#if !classId}
				<FilterSelect
					bind:value={classFilter}
					class="h-9 w-[220px] rounded-lg text-sm"
					options={classFilterOptions}
				/>
			{/if}
			<FilterPanel activeCount={secondaryFilterCount} title={$t('events.secondaryFilters')}>
				<div class="space-y-3">
					<FilterSelect
						bind:value={categoryFilter}
						class="h-9 w-full rounded-md text-xs"
						options={[...categoryOptions]}
					/>
					<FilterSelect
						bind:value={severityFilter}
						class="h-9 w-full rounded-md text-xs"
						options={[...severityOptions]}
					/>
					<FilterSelect
						bind:value={statusFilter}
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
						onclick={() => (createOpen.open = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('events.log')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<IncidentFormModal
		{students}
		{classes}
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
						<div class="col-span-2 font-mono text-xs text-muted-foreground">
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
