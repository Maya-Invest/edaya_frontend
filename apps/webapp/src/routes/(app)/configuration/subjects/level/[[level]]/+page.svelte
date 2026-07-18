<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { findSubjectLevelGroup } from '$lib/academic/subject-level-groups';
	import { getSubjectsPageState } from '../../subjects-page.svelte';
	import LevelDetail from './components/LevelDetail.svelte';

	const subjectsPage = getSubjectsPageState();
	const levelLabel = $derived($page.params.level ? decodeURIComponent($page.params.level) : undefined);
	const levelGroup = $derived.by(() => {
		if (!levelLabel || !subjectsPage.slice) {
			return undefined;
		}
		return findSubjectLevelGroup(
			levelLabel,
			subjectsPage.slice.subjects,
			academicContext.classes,
			academicContext.gradeLevels,
		);
	});
</script>

{#if levelGroup}
	<LevelDetail label={levelGroup.label} subtitle={levelGroup.subtitle} items={levelGroup.items} />
{/if}
