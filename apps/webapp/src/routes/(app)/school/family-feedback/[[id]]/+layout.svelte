<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { getFamilyFeedbackPageState } from '../family-feedback-page.svelte';
	import FamilyFeedbackDrawer from './components/FamilyFeedbackDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const familyFeedbackPage = getFamilyFeedbackPageState();
	const campaign = $derived(familyFeedbackPage.selected);
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/school/family-feedback/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
	}

	$effect(() => {
		const campaignId = $page.params.id;
		if (!shouldResolveSelection(campaignId)) {
			return;
		}

		const version = ++selectionRequestVersion;
		familyFeedbackPage.selectedResolving = true;

		void familyFeedbackPage.ensureDrawerSelection(campaignId)
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
					familyFeedbackPage.selectedResolving = false;
				}
			});
	});
</script>

{#if $page.params.id}
	<FamilyFeedbackDrawer
		{campaign}
		loading={drawerEntityLoading(campaign?.id, $page.params.id)}
		onClose={closeDetail}
	>
		{@render children()}
	</FamilyFeedbackDrawer>
{/if}
