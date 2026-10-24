<script lang="ts">
	import type { NotificationTemplateKey } from '$lib/notification-templates/catalog';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { listRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { templateKeyFromPathname } from '$lib/notification-templates/catalog';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import NotificationRouteModals from './components/NotificationRouteModals.svelte';
	import NotificationTemplatesList from './components/NotificationTemplatesList.svelte';
	import { setNotificationModals } from './notifications-modals.svelte';
	import {
		NotificationsPageState,
		setNotificationsPageState,
	} from './notifications-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();

	const notificationsPage = new NotificationsPageState();
	setNotificationsPageState(notificationsPage);
	const modals = createUrlSyncedModals({
		allowed: ['edit', 'reset-all', 'reset-key'],
		getUrl: () => $page.url,
	});
	setNotificationModals(modals);
	registerVersionInvalidation(notificationsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	const query = notificationsPage.queryListPage();
	const selectedKey = $derived(templateKeyFromPathname($page.url.pathname));

	function selectTemplate(key: NotificationTemplateKey) {
		const path = detailHref.configNotificationTemplate(key);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}
</script>

<NotificationRouteModals />

<PageQuery {query} cacheKey={listRouteCacheKey} loadingTitle={$t('config.notificationTemplates')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('notificationTemplates.emptyTitle')}
			emptyDescription={$t('notificationTemplates.emptyDescription')}
		>
			<NotificationTemplatesList {selectedKey} onSelect={selectTemplate} />
			{@render pageChildren()}
		</DataState>
	{/snippet}
</PageQuery>
