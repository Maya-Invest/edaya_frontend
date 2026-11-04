<script lang="ts">
	import StudentReportCardTab from '../../../../../../school/students/[[id]]/(tabs)/report-card/StudentReportCardTab.svelte';
	import { getClassStudentsPageState } from '../../../class-students-page.svelte';

	const student = $derived(getClassStudentsPageState().selected);
</script>

{#if student}<StudentReportCardTab {student} />{/if}
