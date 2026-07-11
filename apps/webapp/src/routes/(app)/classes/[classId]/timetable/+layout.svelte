<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import {
		TimetablePageState,
		setTimetablePageState,
	} from './[[id]]/timetable-page.svelte';

	const { children }: { children: Snippet } = $props();

	const timetablePage = new TimetablePageState($page.params.classId ?? '');
	setTimetablePageState(timetablePage);
	registerVersionInvalidation(timetablePage);
</script>

{@render children()}
