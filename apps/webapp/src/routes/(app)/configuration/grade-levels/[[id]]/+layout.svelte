<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getGradeLevelsPageState } from '../grade-levels-page.svelte';
	import GradeLevelDrawer from './components/GradeLevelDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const gradeLevelsPage = getGradeLevelsPageState();
	const gradeLevel = $derived(gradeLevelsPage.selected);

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/configuration/grade-levels/[[id]]'), $page.url));
	}

	$effect(() => {
		const gradeLevelId = $page.params.id;
		if (!gradeLevelId) {
			return;
		}
		if (gradeLevelsPage.slice && !gradeLevelsPage.gradeLevelById(gradeLevelId)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	<GradeLevelDrawer
		{gradeLevel}
		loading={!gradeLevel}
		onClose={closeDetail}
	>
		{@render children()}
	</GradeLevelDrawer>
{/if}
