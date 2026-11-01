<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import {
		closeDetailDrawer,
		currentRouteSurfaceHref,
		listSurfaceHref,
		openDetailDrawer,
	} from '$lib/navigation/route-surface-navigation';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import NotificationsInboxView from './components/NotificationsInboxView.svelte';
	import {
		InboxPageState,
		setInboxPageState,
	} from './inbox-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const inboxPage = new InboxPageState(() => $page.url);
	setInboxPageState(inboxPage);
	registerVersionInvalidation(inboxPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	function selectDelivery(delivery: { id: string }) {
		openDetailDrawer(
			listSurfaceHref(appPath('/(app)/account/inbox/[[id]]', { id: delivery.id }), $page.url),
			currentRouteSurfaceHref($page.url),
		);
	}

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/account/inbox/[[id]]'), $page.url));
	}
</script>

<NotificationsInboxView onSelect={selectDelivery} onClose={closeDetail} />
{@render pageChildren()}
