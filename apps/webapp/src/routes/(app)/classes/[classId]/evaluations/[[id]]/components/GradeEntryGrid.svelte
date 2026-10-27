<script lang="ts">
	import type { GradeDraft, MarksReview } from '../../lib/grading-task';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { t } from '$lib/i18n';
	import { onMount } from 'svelte';
	import GradeValueInput from './GradeValueInput.svelte';

	let { review, rows, drafts = $bindable(), baseline, confirmed, failed, disabled = false }: {
		review: MarksReview;
		rows: MarksReview['students'];
		drafts: Record<string, GradeDraft>;
		baseline: Record<string, GradeDraft>;
		confirmed: string[];
		failed: string[];
		disabled?: boolean;
	} = $props();
	let region: HTMLDivElement;
	let announcement = $state('');
	onMount(() => {
		const first = region.querySelector('[data-grade-input]:not(:disabled)');
		if (first instanceof HTMLElement)
			first.focus();
		if (first instanceof HTMLInputElement)
			first.select();
	});
	function advance(input: HTMLInputElement, direction: 1 | -1) {
		const cells = [...region.querySelectorAll<HTMLInputElement>('[data-grade-input]:not(:disabled)')];
		const next = cells[cells.indexOf(input) + direction];
		if (next) {
			next.focus();
			next.select();
			announcement = '';
		}
		else {
			announcement = $t(direction === 1 ? 'gradeGrid.last' : 'gradeGrid.first');
		}
	}
</script>

<div class="space-y-3">
	<p class="text-sm text-muted-foreground">{$t(review.gradingPolicy?.mode === 'mention-first' ? 'gradeGrid.mentionHelp' : 'gradeGrid.keyboardHelp')}</p>
	<p role="status" class="sr-only">{announcement}</p>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div bind:this={region} class="control-focus max-w-full overflow-x-auto rounded-collection border border-border bg-card" role="region" tabindex="0" aria-label={$t('gradeGrid.title')}>
		<table class="ui-entry-table w-full min-w-[36rem] border-collapse text-left text-sm">
			<caption class="sr-only">{$t('gradeGrid.title')}</caption>
			<thead class="bg-secondary text-xs text-muted-foreground"><tr>
				<th scope="col" class="w-5/12 px-4 py-3">{$t('corrections.student')}</th>
				<th scope="col" class="w-3/12 px-4 py-3">{review.gradingPolicy?.mode === 'mention-first' ? $t('grading.mention') : `${$t('marks.scored')} / ${review.assessment.maxScore}`}</th>
				<th scope="col" class="w-2/12 px-4 py-3">{$t('marks.designation')}</th>
				<th scope="col" class="w-2/12 px-4 py-3">{$t('common.status')}</th>
			</tr></thead>
			<tbody>
				{#each rows as student (student.id)}
					{@const changed = JSON.stringify(drafts[student.id]) !== JSON.stringify(baseline[student.id])}
					{@const name = `${student.firstName} ${student.lastName}`}
					<tr class={`border-t border-border focus-within:bg-primary/10 ${changed ? 'bg-primary/5' : ''}`}>
						<th scope="row" class="break-words px-4 py-2 font-semibold">{name}</th>
						<td class="px-4 py-2"><GradeValueInput bind:draft={drafts[student.id]} {review} {disabled} required={changed} compact label={`${name} · ${$t(review.gradingPolicy?.mode === 'mention-first' ? 'grading.mention' : 'marks.scored')}`} onAdvance={advance} /></td>
						<td class="px-4 py-2"><label><span class="sr-only">{name} · {$t('marks.designation')}</span><SelectField bind:value={drafts[student.id].designation} {disabled} class="control-focus w-full border border-input bg-background text-sm disabled:opacity-50">
							<option value="scored">{$t('gradeTask.scored')}</option><option value="absent">{$t('marks.absent')}</option><option value="exempt">{$t('marks.exempt')}</option>
						</SelectField></label></td>
						<td class="px-4 py-2 text-xs">
							{#if failed.includes(student.id)}<span class="text-destructive">{$t('gradeGrid.failed')}</span>
							{:else if changed}<span>{$t('gradeGrid.unsaved')}</span>
							{:else if confirmed.includes(student.id)}<span>{$t('gradeGrid.saved')}</span>
							{:else if drafts[student.id].score || drafts[student.id].mentionId || drafts[student.id].designation !== 'scored'}<span>{$t('gradeGrid.recorded')}</span>
							{:else}<span class="text-muted-foreground">{$t('gradeGrid.unentered')}</span>{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
