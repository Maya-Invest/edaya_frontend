<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getGuardiansPageState } from '../guardians-page.svelte';
	import GuardianDetail from './components/GuardianDetail.svelte';

	const guardiansPage = getGuardiansPageState();
	const guardian = $derived(guardiansPage.selected);

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/school/guardians/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
	}
</script>

{#if guardian}
	<GuardianDetail {guardian} onDeleted={closeDetail} />
{/if}
