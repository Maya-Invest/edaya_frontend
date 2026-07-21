<script lang="ts">
	import { getSubjectsPageState } from '../../../subjects-page.svelte';
	import SubjectLogbookTab from './components/SubjectLogbookTab.svelte';

	const subjectsPage = getSubjectsPageState();
	const subject = $derived(subjectsPage.selected);
</script>

{#if subject}
	<SubjectLogbookTab {subject} />
{/if}
