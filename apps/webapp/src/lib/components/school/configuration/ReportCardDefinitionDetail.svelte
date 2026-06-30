<script lang="ts">
	import type { ReportCardDefinition } from '$lib/types/report-cards';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteReportCardDefinitionMutation } from '$lib/api/mutations/delete-entity.mutations';
	import { publishReportCardDefinitionMutation } from '$lib/api/mutations/report-cards.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { reportCardsContext } from '$lib/report-cards/context.svelte';
	import { toast } from '$lib/toast.svelte';
	import { formatGrade } from '$lib/types/report-cards';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DrawerActionBar from '../shared/DrawerActionBar.svelte';

	const { definition }: { definition: ReportCardDefinition } = $props();

	const live = $derived(
		reportCardsContext.definitions.find(d => d.id === definition.id) ?? definition,
	);
	const level = $derived(academicContext.gradeLevelById(live.gradeLevelId));
	const scale = $derived(reportCardsContext.scales.find(s => s.id === live.gradeScaleId));

	const sectionKindLabel: Record<string, string> = {
		matieres: 'Matières',
		synthese: 'Synthèse',
		appreciation: 'Appréciations',
	};

	async function publish() {
		const ok = await publishReportCardDefinitionMutation(live.id);
		if (ok) {
			const updated = reportCardsContext.definitions.find(entry => entry.id === live.id);
			toast.success(get(t)('reportCards.toastModelPublished', { name: updated?.name ?? live.name }));
		}
	}
</script>

<div class="space-y-5">
	<div>
		<h3 class="font-display text-xl font-semibold">{live.name}</h3>
		<p class="mt-1 text-sm text-muted-foreground">
			{level?.name ?? '—'} · {scale?.name ?? '—'}
		</p>
		<span
			class={cn(
				'mt-2 inline-block rounded-full px-2 py-0.5 font-mono text-[10px] uppercase',
				live.status === 'published'
					? 'bg-accent/15 text-accent-foreground'
					: 'bg-secondary text-muted-foreground',
			)}
		>
			{live.status === 'published' ? $t('academic.published') : $t('academic.draft')}
		</span>
	</div>

	{#if live.status === 'draft'}
		<DrawerActionBar>
			<Button size="sm" class="rounded-full" onclick={publish}>
				{$t('reportCards.publishModel')}
			</Button>
			<PermissionGate permission="REPORT_CARD_CONFIGURE">
				{#snippet children({ disabled, title })}
					<DeleteEntityButton
						{disabled}
						{title}
						confirmTitle={$t('common.deleteConfirmTitle')}
						confirmDescription={$t('reportCards.deleteConfirm', { name: live.name })}
						onConfirm={() => deleteReportCardDefinitionMutation(live.id, {
							successMessage: get(t)('reportCards.toastModelDeleted', { name: live.name }),
						})}
					/>
				{/snippet}
			</PermissionGate>
		</DrawerActionBar>
	{/if}

	<div>
		<p class="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
			{$t('reportCards.sections')}
		</p>
		<div class="overflow-hidden rounded-2xl border border-border">
			<table class="w-full text-sm">
				<thead class="border-b border-border bg-secondary/30 text-left">
					<tr>
						<th class="px-4 py-3 font-medium">{$t('reportCards.sectionName')}</th>
						<th class="px-4 py-3 font-medium">{$t('reportCards.sectionKind')}</th>
						<th class="px-4 py-3 font-medium">{$t('reportCards.coefficient')}</th>
						<th class="px-4 py-3 font-medium">{$t('reportCards.subjects')}</th>
					</tr>
				</thead>
				<tbody>
					{#each [...live.sections].sort((a, b) => a.order - b.order) as section (section.id)}
						<tr class="border-b border-border/60 last:border-0">
							<td class="px-4 py-3 font-medium">{section.name}</td>
							<td class="px-4 py-3 text-muted-foreground">
								{sectionKindLabel[section.kind] ?? section.kind}
							</td>
							<td class="px-4 py-3 font-mono">
								{section.coefficient ?? '—'}
							</td>
							<td class="px-4 py-3 text-sm text-muted-foreground">
								{section.subjectLabels?.length
									? section.subjectLabels.join(', ')
									: section.subjectIds?.length
									? section.subjectIds.join(', ')
									: $t('reportCards.allSubjects')}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	{#if scale}
		<p class="text-xs text-muted-foreground">
			{$t('gradeScales.passing')} : {formatGrade(scale.passingScore, scale)} / {scale.maxScore}
		</p>
	{/if}
</div>
