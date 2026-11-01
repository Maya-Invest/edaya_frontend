<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getGuardiansPageState } from '../guardians-page.svelte';
	import GuardianDrawer from './components/GuardianDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const guardiansPage = getGuardiansPageState();
	const guardian = $derived(guardiansPage.selected);
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/guardians/[[id]]'), $page.url));
	}

	$effect(() => {
		const guardianId = $page.params.id;
		if (!shouldResolveSelection(guardianId)) {
			return;
		}

		const version = ++selectionRequestVersion;
		guardiansPage.selectedResolving = true;

		void guardiansPage.ensureDrawerSelection(guardianId)
			.then((ok) => {
				if (version !== selectionRequestVersion) {
					return;
				}
				if (!ok) {
					closeDetail();
				}
			})
			.catch(() => {
				if (version !== selectionRequestVersion) {
					return;
				}
				closeDetail();
			})
			.finally(() => {
				if (version === selectionRequestVersion) {
					guardiansPage.selectedResolving = false;
				}
			});
	});
</script>

{#if $page.params.id}
	<GuardianDrawer
		{guardian}
		loading={drawerEntityLoading(guardian?.id, $page.params.id)}
		onClose={closeDetail}
	>
		{@render children()}
	</GuardianDrawer>
{/if}
