<script lang="ts">
	import { getStudentsPageState } from '../../../students-page.svelte';
	import StudentProfileTab from './components/StudentProfileTab.svelte';

	const student = $derived(getStudentsPageState().selected);
</script>
{#if student}<StudentProfileTab s={student} />{/if}
