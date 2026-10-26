<script lang="ts">
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { releaseRoutePageQueryOnDestroy } from '$lib/queries/route-page-query-lifecycle.svelte';
	import { onDestroy } from 'svelte';
	import GuardianNotificationSettingsView from './components/GuardianNotificationSettingsView.svelte';
	import StaffNotificationSettingsView from './components/StaffNotificationSettingsView.svelte';
	import {
		NotificationSettingsPageState,
		setNotificationSettingsPageState,
	} from './notification-settings-page.svelte';

	const notificationSettingsPage = new NotificationSettingsPageState();
	setNotificationSettingsPageState(notificationSettingsPage);
	registerVersionInvalidation(notificationSettingsPage);
	releaseRoutePageQueryOnDestroy(() => $page.url);

	onDestroy(() => notificationSettingsPage.dispose());
	const query = notificationSettingsPage.queryListPage();
	const data = $derived(notificationSettingsPage.data);
</script>

<PageQuery {query} cache={false} cacheKey={() => notificationSettingsPage.identity()} loadingTitle={$t('account.notifications.title')}>
	{#snippet children(pageData)}
		<DataState
			status={pageData.status}
			errorMessage={pageData.errorMessage}
			emptyTitle={$t('account.notifications.title')}
			emptyDescription={$t('account.notifications.unavailable')}
		>
			{#if data?.kind === 'guardian'}
				<GuardianNotificationSettingsView data={data} />
			{:else if data?.kind === 'staff'}
				<StaffNotificationSettingsView data={data} />
			{:else}
				<p class="p-6 text-sm text-muted-foreground">{$t('account.notifications.unavailable')}</p>
			{/if}
		</DataState>
	{/snippet}
</PageQuery>
