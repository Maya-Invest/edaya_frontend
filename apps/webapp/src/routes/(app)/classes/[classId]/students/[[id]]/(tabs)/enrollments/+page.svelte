<script lang="ts">
	import StudentEnrollmentDetails from '../../../../../../school/students/[[id]]/(tabs)/enrollments/StudentEnrollmentDetails.svelte';
	import { getClassStudentsPageState } from '../../../class-students-page.svelte';

	const student = $derived(getClassStudentsPageState().selected);
</script>
{#if student}<StudentEnrollmentDetails s={student} />{/if}
