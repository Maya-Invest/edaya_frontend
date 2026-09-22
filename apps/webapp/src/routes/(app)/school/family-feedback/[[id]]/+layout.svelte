<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { getFamilyFeedbackPageState } from '../family-feedback-page.svelte';
	import FamilyFeedbackDrawer from './components/FamilyFeedbackDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const familyFeedbackPage = getFamilyFeedbackPageState();
	const campaign = $derived(familyFeedbackPage.selected);
	const shouldResolveSelection = createDrawerEntitySelection();
	let selectionRequestVersion = 0;

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/family-feedback/[[id]]'), $page.url));
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
		{@render children?.()}
	</FamilyFeedbackDrawer>
{/if}
