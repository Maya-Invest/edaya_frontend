<script lang="ts">
	import { getTeachersPageState } from '../../../teachers-page.svelte';
	import TeacherAssignmentsTab from './components/TeacherAssignmentsTab.svelte';

	const teacher = $derived(getTeachersPageState().selected);
</script>

{#if teacher}
	<TeacherAssignmentsTab {teacher} />
{/if}
