<script lang="ts">
	import { getTimetablePageState } from '../../../timetable-page.svelte';
	import SessionDetailsTab from './components/SessionDetailsTab.svelte';

	const session = $derived(getTimetablePageState().selected);
</script>

{#if session}
	<SessionDetailsTab s={session} />
{/if}
