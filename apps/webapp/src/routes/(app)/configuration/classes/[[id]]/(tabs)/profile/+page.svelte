<script lang="ts">
	import { getClassesPageState } from '../../../classes-page.svelte';
	import ClassGroupProfileTab from './components/ClassGroupProfileTab.svelte';

	const classGroup = $derived(getClassesPageState().selected);
</script>

{#if classGroup}
	<ClassGroupProfileTab {classGroup} />
{/if}
