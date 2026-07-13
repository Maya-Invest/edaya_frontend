<script lang="ts">
	import { getTeachingPageState } from '../../../teaching-page.svelte';
	import SubjectLogbookTab from './components/SubjectLogbookTab.svelte';

	const teachingPage = getTeachingPageState();
	const subject = $derived(teachingPage.selected);
</script>

{#if subject}
	<SubjectLogbookTab {subject} />
{/if}
