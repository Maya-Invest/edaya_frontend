<script lang="ts">
	import type { AnnualReportResult } from '$lib/api/annual-report-cards-data';
	import type { AnnualReportCardState } from '../annual-report-card-state.svelte';
	import { academicContext } from '$lib/academic/context.svelte';
	import { annualReportReadiness } from '$lib/api/annual-report-cards-data';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';

	let { open = $bindable(false), annualState, studentId, classId }: {
		open?: boolean;
		annualState: AnnualReportCardState;
		studentId: string;
		classId: string;
	} = $props();
	let targetId = $state('');
	let definitionId = $state('');
	let sourceIds = $state<string[]>([]);
	let weights = $state<Record<string, number>>({});
	let busy = $state(false);
	let hydratedTarget = $state('');
	let formContext = $state('');
	const definitions = $derived(annualState.definitionsFor(studentId));
	const candidates = $derived(annualState.results.filter(result => result.periodId === targetId));
	const annual = $derived(candidates.length === 1 && candidates[0].aggregation?.source === 'report_cards' ? candidates[0] : undefined);
	const published = $derived(annual?.status === 'published');
	const readiness = $derived(annualReportReadiness(annualState.periods, annualState.results, sourceIds, targetId));
	const sourcesReady = $derived(sourceIds.length > 0 && new Set(sourceIds).size === sourceIds.length && readiness.every(entry => entry.ready));
	const weightsValid = $derived(sourceIds.every(id => Number.isFinite(weights[id] ?? 1) && (weights[id] ?? 1) > 0));
	const matchesSelection = $derived(Boolean(annual && annual.reportCardDefinitionId === definitionId
		&& JSON.stringify([...annual.aggregation!.sourcePeriodIds].sort()) === JSON.stringify([...sourceIds].sort())
		&& sourceIds.every(id => (annual.aggregation!.periodWeightsByPeriodId?.[id] ?? 1) === (weights[id] ?? 1))));
	const recordedSourcesCurrent = $derived(Boolean(annual?.aggregation?.sourceReportVersions
		&& readiness.every(entry => annual.aggregation!.sourceReportVersions?.some(source => source.periodId === entry.id && source.resultId === entry.report?.id && source.version === entry.report?.version))));
	const canPublish = $derived(recordedSourcesCurrent && matchesSelection && sourcesReady && !annual?.calculationStale && !annual?.pendingCorrectionIds?.length
		&& !annual?.pendingAssessmentIds?.length && annualState.periods.find(period => period.id === targetId)?.status === 'published');
	const selectionValid = $derived(Boolean(targetId && annualState.periods.some(period => period.id === targetId) && definitionId && sourcesReady && weightsValid && candidates.length <= 1 && (!candidates.length || annual)));

	$effect(() => {
		const context = `${studentId}:${academicContext.yearId}`;
		if (formContext !== context) {
			formContext = context;
			targetId = '';
		}
		const key = `${open}:${studentId}:${academicContext.yearId}:${targetId}`;
		if (key === hydratedTarget)
			return;
		hydratedTarget = key;
		if (annual) {
			definitionId = annual.reportCardDefinitionId;
			sourceIds = [...annual.aggregation!.sourcePeriodIds];
			weights = { ...annual.aggregation!.periodWeightsByPeriodId };
		}
		else {
			sourceIds = [];
			weights = {};
			definitionId = definitions.length === 1 ? definitions[0].id : '';
		}
	});

	function toggle(id: string, selected: boolean) {
		sourceIds = selected ? [...sourceIds, id] : sourceIds.filter(value => value !== id);
	}
	async function generate() {
		if (!selectionValid || busy)
			return;
		busy = true;
		try {
			await annualState.generate({ studentId, targetId, definitionId, sourceIds, weights });
		}
		finally { busy = false; }
	}
	async function publish(result: AnnualReportResult) {
		if (!canPublish || busy)
			return;
		busy = true;
		try {
			await annualState.publish(result);
		}
		finally { busy = false; }
	}
	async function issue() {
		if (!annual || !published || !canPublish || busy)
			return;
		busy = true;
		try {
			if (await annualState.issue(annual))
				open = false;
		}
		finally { busy = false; }
	}
	function subjectRows(result: AnnualReportResult) {
		type Node = { sectionId?: string; name?: string; sectionKind?: string; average?: number; weight?: number; comment?: string; subResults?: Node[] };
		const labels: Record<string, string> = {};
		const definition = definitions.find(entry => entry.id === result.reportCardDefinitionId);
		const collect = (nodes: NonNullable<typeof definition>['sections']) => {
			for (const node of nodes) {
				labels[node.id] = node.name;
				if (node.children)
					collect(node.children);
			}
		};
		if (definition)
			collect(definition.sections);
		const flatten = (nodes: Node[]): Node[] => nodes.flatMap(node => [node, ...flatten(node.subResults ?? [])]);
		return flatten(result.sectionResults as Node[]).filter(node => node.sectionKind === 'subject').map(node => ({ ...node, name: labels[node.sectionId ?? ''] ?? node.name }));
	}
</script>

<FormModal bind:open title={$t('reportCards.annual.title')} description={$t('reportCards.annual.description')}
	submitLabel={$t('documents.generatePdf')} cancelLabel={$t('common.close')} {busy}
	submitDisabled={!published || !canPublish} onSubmit={issue} contentClass="max-w-2xl">
	{#snippet footer({ close })}
		<Button variant="ghost" disabled={busy} onclick={close}>{$t('common.close')}</Button>
		<PermissionGate permission="REPORT_CARD_PUBLISH" {classId} mode="disable" tooltip={$t('documents.permissionIssue')}>
			{#snippet children({ disabled, title })}<Button {title} disabled={disabled || busy || !published || !canPublish} onclick={issue}>{$t('documents.generatePdf')}</Button>{/snippet}
		</PermissionGate>
	{/snippet}
	<div class="space-y-1.5">
		<Label>{$t('reportCards.annual.target')}</Label>
		<Select.Root type="single" bind:value={targetId}>
			<Select.Trigger><Select.Value placeholder={$t('reportCards.annual.chooseTarget')}>{annualState.periods.find(period => period.id === targetId)?.label}</Select.Value></Select.Trigger>
			<Select.Content>{#each annualState.periods as period (period.id)}<Select.Item value={period.id} label={period.label}>{period.label} · {period.range}</Select.Item>{/each}</Select.Content>
		</Select.Root>
	</div>
	<div class="space-y-1.5">
		<Label>{$t('reportCards.annual.definition')}</Label>
		<Select.Root type="single" bind:value={definitionId} disabled={published || busy}>
			<Select.Trigger><Select.Value placeholder={$t('reportCards.annual.chooseDefinition')}>{definitions.find(definition => definition.id === definitionId)?.name}</Select.Value></Select.Trigger>
			<Select.Content>{#each definitions as definition (definition.id)}<Select.Item value={definition.id} label={definition.name}>{definition.name}</Select.Item>{/each}</Select.Content>
		</Select.Root>
	</div>
	{#if definitions.length === 0}<p class="text-sm text-muted-foreground">{$t('reportCards.annual.noDefinition')}</p>{/if}
	<fieldset class="space-y-2" disabled={published || busy || !targetId}>
		<legend class="mb-2 text-sm font-medium">{$t('reportCards.annual.periods')}</legend>
		{#each annualState.periods.filter(period => period.id !== targetId) as period (period.id)}
			<div class="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
				<Checkbox id={`annual-source-${period.id}`} checked={sourceIds.includes(period.id)} onCheckedChange={checked => toggle(period.id, checked === true)} disabled={published || busy || !targetId} />
				<Label for={`annual-source-${period.id}`} class="min-w-0 flex-1">{period.label}</Label>
				{#if sourceIds.includes(period.id)}
					<Label for={`annual-weight-${period.id}`}>{$t('reportCards.annual.weight')}</Label>
					<Input id={`annual-weight-${period.id}`} type="number" min="0.01" step="0.01" class="w-20" value={String(weights[period.id] ?? 1)} oninput={event => weights = { ...weights, [period.id]: Number(event.currentTarget.value) }} />
					<span class="text-xs text-muted-foreground">{$t(readiness.find(entry => entry.id === period.id)?.ready ? 'reportCards.annual.ready' : 'reportCards.annual.notReady')}</span>
				{/if}
			</div>
		{/each}
	</fieldset>
	<p class="text-xs text-muted-foreground">{$t('reportCards.annual.completeCycle')}</p>
	{#if targetId && (!sourcesReady || !weightsValid)}<p role="status" class="text-sm text-muted-foreground">{$t('reportCards.annual.prerequisites')}</p>{/if}
	{#if targetId && annualState.periods.find(period => period.id === targetId)?.status !== 'published'}<p class="text-sm text-muted-foreground">{$t('reportCards.annual.publishPeriod')}</p>{/if}
	{#if candidates.length && !annual}<p role="alert" class="text-sm text-destructive">{$t('reportCards.annual.targetConflict')}</p>{/if}
	{#if !published || !recordedSourcesCurrent}
		<PermissionGate permission="REPORT_CARD_GENERATE" {classId} mode="disable">
			{#snippet children({ disabled, title })}<Button {title} disabled={disabled || busy || !selectionValid} onclick={generate}>{$t('reportCards.annual.generate')}</Button>{/snippet}
		</PermissionGate>
	{/if}
	{#if annual}
		<div class="space-y-2 rounded-xl border border-border p-3">
			<p class="text-sm font-semibold">{$t('reportCards.annual.review')} · {$t(published ? 'academic.published' : 'academic.draft')}</p>
			{#each subjectRows(annual) as row (row.sectionId)}
				<p class="flex justify-between gap-3 text-sm"><span>{row.name}</span><span class="font-sans tabular-nums">{row.average === undefined ? '—' : row.average.toFixed(2)} / 20</span></p>
			{/each}
			<p class="text-sm font-semibold">{$t('reportCards.overall')}: {annual.overallAverage == null ? '—' : annual.overallAverage.toFixed(2)} / 20</p>
			{#if !matchesSelection || !recordedSourcesCurrent}<p role="status" class="text-sm text-muted-foreground">{$t('reportCards.annual.regenerate')}</p>{/if}
		</div>
		{#if !published}<PermissionGate permission="REPORT_CARD_PUBLISH" {classId} mode="disable">
			{#snippet children({ disabled, title })}<Button {title} disabled={disabled || busy || !canPublish} onclick={() => publish(annual!)}>{$t('reportCards.publish')}</Button>{/snippet}
		</PermissionGate>{/if}
	{/if}
</FormModal>
