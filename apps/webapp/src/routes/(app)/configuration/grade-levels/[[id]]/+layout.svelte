<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getGradeLevelsPageState } from '../grade-levels-page.svelte';
	import GradeLevelDrawer from './components/GradeLevelDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const gradeLevelsPage = getGradeLevelsPageState();
	const gradeLevel = $derived(gradeLevelsPage.selected);

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/configuration/grade-levels/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
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
