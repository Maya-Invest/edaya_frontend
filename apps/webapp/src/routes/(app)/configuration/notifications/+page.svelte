<script lang="ts">
	import NotificationTemplatesView from '$lib/components/school/configuration/NotificationTemplatesView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { queryNotificationTemplatesPage } from '$lib/queries/notification-templates.queries';

	const query = queryNotificationTemplatesPage();
</script>

<PageQuery {query} loadingTitle={$t('config.notificationTemplates')}>
	{#snippet children(data)}
		<DataState
			preserveShell
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('notificationTemplates.emptyTitle')}
			emptyDescription={$t('notificationTemplates.emptyDescription')}
		>
			<NotificationTemplatesView {data} />
		</DataState>
	{/snippet}
</PageQuery>
