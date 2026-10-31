<script lang="ts">
	import StudentProfileTab from '../../../../../../school/students/[[id]]/(tabs)/profile/components/StudentProfileTab.svelte';
	import { getClassStudentsPageState } from '../../../class-students-page.svelte';

	const student = $derived(getClassStudentsPageState().selected);
</script>
{#if student}<StudentProfileTab s={student} />{/if}
