<script lang="ts">
	import type { PageLoadMeta } from '$lib/page/load-state';
	import type { ClassStudentsPageSlice } from '../class-students-page.svelte';
	import { untrack } from 'svelte';
	import { getClassStudentsPageState } from '../class-students-page.svelte';

	const {
		data,
	}: {
		data: Partial<ClassStudentsPageSlice> & PageLoadMeta;
	} = $props();

	const classStudentsPage = getClassStudentsPageState();

	$effect(() => {
		const classId = data.classId;
		if (!classId || !['ready', 'empty', 'no-match'].includes(data.status)) {
			return;
		}
		untrack(() => {
			classStudentsPage.applySlice(classId, data);
		});
	});
</script>
