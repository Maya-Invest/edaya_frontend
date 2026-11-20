<script lang="ts">
	import { getStudentsPageState } from '../../../students-page.svelte';
	import StudentReportCardTab from './StudentReportCardTab.svelte';

	const student = $derived(getStudentsPageState().selected);
</script>

{#if student}<StudentReportCardTab {student} />{/if}
