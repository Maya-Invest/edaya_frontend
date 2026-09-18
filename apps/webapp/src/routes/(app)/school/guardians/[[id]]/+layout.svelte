<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getGuardiansPageState } from '../guardians-page.svelte';
	import GuardianDrawer from './components/GuardianDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const guardiansPage = getGuardiansPageState();
	const guardian = $derived(guardiansPage.selected);
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/school/guardians/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
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
