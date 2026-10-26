<script lang="ts">
	import type { GradeDraft, GradeEntryPolicy } from '../../lib/grading-task';
	import { t } from '$lib/i18n';
	import GradeValueInput from './GradeValueInput.svelte';

	let { draft = $bindable(), review, disabled = false, required = true }: { draft: GradeDraft; review: GradeEntryPolicy; disabled?: boolean; required?: boolean } = $props();
	const control = 'min-h-11 w-full rounded-full border border-input bg-background px-4 py-2 text-sm disabled:opacity-50';
</script>
<div class="grid gap-4 sm:grid-cols-2">
	<label class="space-y-2 text-sm"><span>{$t('marks.designation')}</span>
		<select class={control} bind:value={draft.designation} {disabled}>
			{#each ['scored', 'absent', 'exempt'] as designation (designation)}<option value={designation}>{$t(designation === 'scored' ? 'gradeTask.scored' : `marks.${designation}`)}</option>{/each}
		</select>
	</label>
	{#if draft.designation === 'scored'}<GradeValueInput bind:draft {review} {disabled} {required} />{/if}
</div>
