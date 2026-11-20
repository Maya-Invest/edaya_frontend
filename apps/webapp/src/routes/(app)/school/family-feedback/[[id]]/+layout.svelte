<script lang="ts">
	import type { PageLoadState } from '$lib/page/load-state';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { ApiError } from '@maya-invest/edaya-api-client';
	import { untrack } from 'svelte';
	import { getFamilyFeedbackPageState } from '../family-feedback-page.svelte';
	import FamilyFeedbackDrawer from './components/FamilyFeedbackDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const familyFeedbackPage = getFamilyFeedbackPageState();
	const campaign = $derived(familyFeedbackPage.selected);
	let attempt = $state(0);
	let status = $state<PageLoadState>('loading');
	const selectedId = $derived($page.params.id);

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/school/family-feedback/[[id]]'), $page.url));
	}

	$effect(() => {
		const id = selectedId;
		void attempt;
		void familyFeedbackPage.detailReload;
		void familyFeedbackPage.optionScope;
		if (!id) {
			untrack(() => familyFeedbackPage.clearDetail());
			return;
		}
		const controller = new AbortController();
		status = 'loading';
		untrack(() => void familyFeedbackPage.ensureDrawerSelection(id, controller.signal)
			.then((found) => {
				if (!controller.signal.aborted)
					status = found ? 'ready' : 'unavailable';
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					status = error instanceof ApiError && (error.status === 401 || error.status === 403) ? 'denied' : 'error';
				}
			}));
		return () => controller.abort();
	});
</script>

{#if $page.params.id}
	<FamilyFeedbackDrawer
		{campaign}
		status={familyFeedbackPage.history.denied ? 'denied' : status}
		onRetry={() => attempt++}
		onClose={closeDetail}
	>
		{@render children?.()}
	</FamilyFeedbackDrawer>
{/if}
