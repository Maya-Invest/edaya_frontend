<script lang="ts">
	import type { PageLoadMeta } from '$lib/page/load-state';
	import type { TeachingPageSlice } from '../teaching-page.svelte';
	import { untrack } from 'svelte';
	import { getTeachingPageState } from '../teaching-page.svelte';

	const {
		data,
	}: {
		data: Partial<TeachingPageSlice> & PageLoadMeta;
	} = $props();

	const teachingPage = getTeachingPageState();

	$effect(() => {
		const classId = data.classId;
		if (!classId) {
			return;
		}
		untrack(() => {
			teachingPage.seed(classId, data);
		});
	});
</script>
