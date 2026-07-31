<script lang="ts">
	import { getGradeLevelsPageState } from '../grade-levels-page.svelte';
	import GradeLevelDetail from './components/GradeLevelDetail.svelte';

	const gradeLevelsPage = getGradeLevelsPageState();
	const gradeLevel = $derived(gradeLevelsPage.selected);
</script>

{#if gradeLevel}
	<GradeLevelDetail {gradeLevel} />
{/if}
