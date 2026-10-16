<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import LevelDetails from '../levels/components/LevelDetails.svelte';
	import { getGradeLevelsPageState } from '../levels/grade-levels-page.svelte';

	const owner = getGradeLevelsPageState();
	const level = $derived(owner.gradeLevelById($page.url.searchParams.get('gradeLevel') ?? ''));
</script>

{#if level}
	{#key `${level.id}:${academicContext.yearId}`}<LevelDetails gradeLevel={level} />{/key}
{/if}
