<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import LevelDetails from '../levels/components/LevelDetails.svelte';
	import { getGradeLevelsPageState } from '../levels/grade-levels-page.svelte';

	const { children }: { children: Snippet } = $props();
	const levelsPage = getGradeLevelsPageState();
	const level = $derived(levelsPage.gradeLevelById($page.url.searchParams.get('gradeLevel') ?? ''));
</script>
{#if level}{#key `${level.id}:${academicContext.yearId}`}<LevelDetails gradeLevel={level} />{/key}{/if}
{@render children()}
