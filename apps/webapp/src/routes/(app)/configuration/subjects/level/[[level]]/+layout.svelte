<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { findSubjectLevelGroup } from '$lib/academic/subject-level-groups';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getSubjectsPageState } from '../../subjects-page.svelte';
	import LevelDrawer from './components/LevelDrawer.svelte';

	const { children }: { children: Snippet } = $props();

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

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/configuration/subjects')}${next.search}` as ResolvedPathname;
		appGoto(href);
	}

	$effect(() => {
		if (!levelLabel) {
			return;
		}
		if (subjectsPage.slice && !levelGroup) {
			closeDetail();
		}
	});
</script>

{#if levelLabel}
	<LevelDrawer
		label={levelLabel}
		loading={!levelGroup}
		onClose={closeDetail}
	>
		{@render children()}
	</LevelDrawer>
{/if}
