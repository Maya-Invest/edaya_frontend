<script lang="ts">
	import AppLoading from '$lib/components/layout/AppLoading.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import { onMount } from 'svelte';
	import { RootEntryState } from './root-entry-state.svelte';

	const state = new RootEntryState();

	onMount(() => {
		void state.enterApp();
		return state.dispose;
	});
</script>

{#if state.failed}
	<DataState status="error" onRetry={state.enterApp} />
{:else}
	<AppLoading />
{/if}
