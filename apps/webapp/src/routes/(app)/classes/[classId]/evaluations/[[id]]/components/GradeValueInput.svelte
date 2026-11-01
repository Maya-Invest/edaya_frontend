<script lang="ts">
	import type { GradeDraft, GradeEntryPolicy } from '../../lib/grading-task';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { t } from '$lib/i18n';
	import { gradeValues } from '../../lib/grading-task';

	let { draft = $bindable(), review, disabled = false, required = true, label, compact = false, onAdvance }: {
		draft: GradeDraft;
		review: GradeEntryPolicy;
		disabled?: boolean;
		required?: boolean;
		label?: string;
		compact?: boolean;
		onAdvance?: (input: HTMLInputElement, direction: 1 | -1) => void;
	} = $props();
	let scoreInput = $state<HTMLInputElement>();
	const control = 'control-focus min-h-11 w-full min-w-0 rounded-full border border-input bg-background px-4 py-2 text-sm disabled:opacity-50';
	$effect(() => {
		const message = draft.score.trim() && !gradeValues(draft, review) ? $t('gradeGrid.invalidScore', { maximum: review.assessment.maxScore }) : '';
		scoreInput?.setCustomValidity(message);
		if (!message)
			scoreInput?.removeAttribute('aria-invalid');
	});
</script>

{#if draft.designation === 'scored'}
	<label class="block min-w-0 text-sm" class:space-y-2={!compact}>
		<span class:sr-only={compact}>{label ?? (review.gradingPolicy?.mode === 'mention-first' ? $t('grading.mention') : `${$t('marks.scored')} · ${$t('eval.maxScore')} ${review.assessment.maxScore}`)}</span>
		{#if review.gradingPolicy?.mode === 'mention-first'}
			<SelectField class={control} bind:value={draft.mentionId} {disabled} {required} data-grade-input>
				<option value="">{$t('grading.mention')}</option>
				{#each review.gradingPolicy.scale.ranges.filter(row => row.id) as mention (mention.id)}<option value={mention.id}>{mention.letter}{mention.interpretation ? ` · ${mention.interpretation}` : ''}</option>{/each}
			</SelectField>
		{:else}
			<input class={`ui-field ${control} tabular-nums`} bind:this={scoreInput} type="text" inputmode="decimal" bind:value={draft.score} {disabled} {required} pattern="(?:[0-9]+(?:[.,][0-9]*)?|[.,][0-9]+)" data-grade-input
				onfocus={(event) => {
					if (onAdvance)
						event.currentTarget.select();
				}}
				onkeydown={(event) => {
					if (onAdvance && event.key === 'Enter' && !event.isComposing) {
						event.preventDefault();
						if (!event.currentTarget.reportValidity()) {
							event.currentTarget.setAttribute('aria-invalid', 'true');
							return;
						}
						onAdvance(event.currentTarget, event.shiftKey ? -1 : 1);
					}
				}} />
		{/if}
	</label>
{:else}<span class="text-sm">{$t(`marks.${draft.designation}`)}</span>{/if}
