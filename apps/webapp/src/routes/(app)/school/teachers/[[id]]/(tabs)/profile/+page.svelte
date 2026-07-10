<script lang="ts">
	import { getTeachersPageState } from '../../../teachers-page.svelte';
	import TeacherProfileTab from './components/TeacherProfileTab.svelte';

	const teacher = $derived(getTeachersPageState().selected);
</script>

{#if teacher}
	<TeacherProfileTab {teacher} />
{/if}
