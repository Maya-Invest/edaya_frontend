<script lang="ts">
	import { getStudentsPageState } from '../../../students-page.svelte';
	import StudentEnrollmentDetails from './StudentEnrollmentDetails.svelte';

	const student = $derived(getStudentsPageState().selected);
</script>
{#if student}<StudentEnrollmentDetails s={student} />{/if}
