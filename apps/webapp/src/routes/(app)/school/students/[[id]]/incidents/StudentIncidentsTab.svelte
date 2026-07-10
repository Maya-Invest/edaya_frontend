<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { fmtDateFr } from '$lib/components/school/shared/drawer-constants';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { AlertTriangle } from '$lib/icons';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { cn } from '$lib/utils';
	import { getStudentsPageState } from '../../students-page.svelte';

	const { s }: { s: Student } = $props();

	const studentsPage = getStudentsPageState();
	const incidentsData = $derived(studentsPage.incidentsSummaryFor(s.id));

	const modals = getDrawerUrlModals();
</script>

<div class="space-y-4">
	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-xl bg-destructive/10 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">Élevés</p>
			<p class="mt-1 font-display text-2xl text-destructive">{incidentsData.high}</p>
		</div>
		<div class="rounded-xl bg-secondary/60 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">Moyens</p>
			<p class="mt-1 font-display text-2xl">{incidentsData.med}</p>
		</div>
		<div class="rounded-xl bg-secondary p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">Faibles</p>
			<p class="mt-1 font-display text-2xl">{incidentsData.low}</p>
		</div>
	</div>
	<div>
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Évènements</Label>
		<div class="mt-2 space-y-2">
			{#if incidentsData.sorted.length === 0}
				<DrawerEmptyState label={$t('drawer.noIncidents')}>
					{#snippet icon()}
						<AlertTriangle class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each incidentsData.sorted as incident (incident.id)}
					<div class="rounded-xl border border-border bg-card p-4">
						<div class="flex items-center justify-between">
							<span
								class={cn(
									'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
									incident.severity === 'high'
										? 'bg-destructive/10 text-destructive'
										: incident.severity === 'medium'
										? 'bg-highlight-soft text-highlight'
										: 'bg-secondary text-muted-foreground',
								)}
							>
								{$t(`events.severity.${incident.severity}`)}
							</span>
							<span class="font-mono text-[10px] text-muted-foreground">{fmtDateFr(incident.date)}</span>
						</div>
						<p class="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
							{$t(`events.cat.${incident.category}`)}
						</p>
						<p class="mt-1 text-sm">{incident.summary}</p>
					</div>
				{/each}
			{/if}
		</div>
	</div>
	<PermissionGate
		permission="DISCIPLINE_CREATE"
		classId={s.classId}
		mode="disable"
		tooltip="Droit DISCIPLINE_CREATE requis."
	>
		{#snippet children({ disabled, title })}
			<Button
				variant="ghost"
				class="w-full rounded-full border border-dashed border-border"
				{disabled}
				{title}
				onclick={() => modals?.open('add-incident')}
			>
				Consigner un incident
			</Button>
		{/snippet}
	</PermissionGate>
</div>
