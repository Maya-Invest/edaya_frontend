<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { lang, t } from '$lib/i18n';
	import { ClipboardCheck } from '$lib/icons';
	import { getTeachersPageState } from '../../../../teachers-page.svelte';
	import { getTeacherEvaluationsTabState } from '../teacher-evaluations-tab.svelte';

	const { teacher }: { teacher: Teacher } = $props();
	const teachersPage = getTeachersPageState();
	const evaluationsTab = getTeacherEvaluationsTabState();
	const rows = $derived(evaluationsTab.evaluationsFor(teacher.id));

	const groups = $derived.by(() => {
		const labeled = rows.map((row) => {
			const className = academicContext.classes.find(entry => entry.id === row.classId)?.name ?? row.classId;
			const subjectName = teachersPage.subjectLabel(row.classSubjectId) || row.classSubjectId;
			return { label: `${className} · ${subjectName}`, row };
		});
		const labels = [...new Set(labeled.map(item => item.label))];
		return labels.map(label => ({
			label,
			evaluations: labeled.filter(item => item.label === label).map(item => item.row),
		}));
	});

	function kindLabel(kind: string): string {
		if (kind === 'quiz' || kind === 'homework' || kind === 'project' || kind === 'other') {
			return $t(`eval.kind.${kind}`);
		}
		return $t('eval.kind.other');
	}

	function formatDate(value: string): string {
		if (!value) {
			return '—';
		}
		return new Date(value).toLocaleDateString($lang, { day: 'numeric', month: 'short' });
	}
</script>

<div class="space-y-3">
	<p class="text-xs text-muted-foreground">{$t('teacher.evaluationsHint')}</p>
	{#if groups.length === 0}
		<DrawerEmptyState label={$t('teacher.evaluationsEmpty')}>
			{#snippet icon()}
				<ClipboardCheck class="h-5 w-5 text-muted-foreground" />
			{/snippet}
		</DrawerEmptyState>
	{:else}
		{#each groups as group (group.label)}
			<div class="space-y-2">
				<h4 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{group.label}
				</h4>
				<ul class="divide-y divide-border/60 overflow-hidden rounded-collection border border-border bg-card">
					{#each group.evaluations as evaluation (evaluation.id)}
						<li>
							<a
								href={detailHref.classEvaluation(evaluation.classId, evaluation.id)}
								class="flex items-start justify-between gap-3 px-4 py-3 hover:bg-secondary/40"
							>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{evaluation.title}</p>
									<p class="mt-1 text-xs text-muted-foreground">{formatDate(evaluation.date)}</p>
								</div>
								<span class="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
									{kindLabel(evaluation.kind)}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	{/if}
</div>
