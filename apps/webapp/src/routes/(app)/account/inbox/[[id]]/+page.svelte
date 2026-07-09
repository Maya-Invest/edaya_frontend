<script lang="ts">
	import { page } from '$app/stores';
	import NotificationsInboxView from '$lib/components/account/NotificationsInboxView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { queryInboxPage } from '$lib/queries/account.queries';

	const selectedId = $derived($page.params.id);
	const query = queryInboxPage();

	function selectDelivery(delivery: { id: string }) {
		appGoto(appPath('/(app)/account/inbox/[[id]]', { id: delivery.id }));
	}

	function closeDetail() {
		appGoto(appPath('/(app)/account/inbox/[[id]]'));
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
			<NotificationsInboxView
				deliveries={data.deliveries}
				{selectedId}
				onSelect={selectDelivery}
				onClose={closeDetail}
			/>
		</DataState>
	{/snippet}
</PageQuery>
