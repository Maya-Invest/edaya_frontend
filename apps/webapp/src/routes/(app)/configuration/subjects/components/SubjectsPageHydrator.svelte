<script lang="ts">
	import type { PageLoadMeta } from '$lib/page/load-state';
	import type { SubjectsPageSlice } from '../subjects-page.svelte';
	import { untrack } from 'svelte';
	import { getSubjectsPageState } from '../subjects-page.svelte';

	const {
		data,
	}: {
		data: Partial<SubjectsPageSlice> & PageLoadMeta;
	} = $props();

	const subjectsPage = getSubjectsPageState();

	$effect(() => {
		untrack(() => {
			subjectsPage.seed(data);
		});
	});
</script>
