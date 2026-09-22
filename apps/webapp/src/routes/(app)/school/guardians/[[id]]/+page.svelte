<script lang="ts">
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getGuardiansPageState } from '../guardians-page.svelte';
	import GuardianDetail from './components/GuardianDetail.svelte';

	const guardiansPage = getGuardiansPageState();
	const guardian = $derived(guardiansPage.selected);

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/guardians/[[id]]'), $page.url));
	}
</script>

{#if guardian}
	<GuardianDetail {guardian} onDeleted={closeDetail} />
{/if}
