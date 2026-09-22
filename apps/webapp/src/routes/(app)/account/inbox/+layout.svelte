<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { appPath } from '$lib/navigation/app-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import {
		closeDetailDrawer,
		currentRouteSurfaceHref,
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

	const query = inboxPage.queryListPage();

	function selectDelivery(delivery: { id: string }) {
		openDetailDrawer(
			appPath('/(app)/account/inbox/[[id]]', { id: delivery.id }),
			currentRouteSurfaceHref($page.url),
		);
	}

	function closeDetail() {
		closeDetailDrawer(appPath('/(app)/account/inbox/[[id]]'));
	}
</script>

<PageQuery {query} loadingTitle={$t('account.inbox.title')}>
	{#snippet children(data)}
		<DataState
			status={data.subjectId ? data.status : 'empty'}
			errorMessage={data.errorMessage}
			emptyTitle={$t('account.inbox.title')}
			emptyDescription={data.subjectId ? $t('account.inbox.empty') : $t('account.notifications.noSubject')}
		>
			<NotificationsInboxView onSelect={selectDelivery} onClose={closeDetail} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
