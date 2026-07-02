<script lang="ts">
	import type { ReportCardSection } from '$lib/types/report-cards';
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import ReportCardSectionTree from './ReportCardSectionTree.svelte';

	interface Props {
		sections: ReportCardSection[];
		depth?: number;
	}

	const { sections, depth = 0 }: Props = $props();

	function sectionKindLabel(kind: ReportCardSection['kind']): string {
		if (!kind) {
			return '';
		}
		return get(t)(`reportCards.sectionKind.${kind}`);
	}

	function groupScopeLabel(section: ReportCardSection): string | undefined {
		if (section.sectionType !== 'group' || section.children?.length) {
			return undefined;
		}
		if (section.kind === 'synthese') {
			return get(t)('reportCards.sectionSummaryScope');
		}
		if (section.kind === 'appreciation') {
			return get(t)('reportCards.sectionCommentsScope');
		}
		return undefined;
	}

	function coefficientLabel(section: ReportCardSection): string {
		if (section.coefficient === undefined) {
			return '—';
		}
		return String(section.coefficient);
	}
</script>

<ul class={cn('space-y-1', depth > 0 && 'mt-1 ml-3 border-l border-border/80 pl-3')}>
	{#each [...sections].sort((left, right) => left.order - right.order) as section (section.id)}
		<li>
			{#if section.sectionType === 'subject'}
				<div class="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm">
					<span class="text-muted-foreground">{section.subjectLabel ?? section.name}</span>
					<span class="shrink-0 font-mono text-xs text-muted-foreground">
						{coefficientLabel(section)}
					</span>
				</div>
			{:else}
				<div class="rounded-xl border border-border/70 bg-background/60 px-3 py-2.5">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="font-medium">{section.name}</p>
							{#if section.kind}
								<p class="text-xs text-muted-foreground">{sectionKindLabel(section.kind)}</p>
							{/if}
							{#if groupScopeLabel(section)}
								<p class="mt-1 text-xs text-muted-foreground">{groupScopeLabel(section)}</p>
							{/if}
						</div>
						<span class="shrink-0 font-mono text-xs text-muted-foreground">
							{coefficientLabel(section)}
						</span>
					</div>
				</div>
				{#if section.children?.length}
					<ReportCardSectionTree sections={section.children} depth={depth + 1} />
				{/if}
			{/if}
		</li>
	{/each}
</ul>
