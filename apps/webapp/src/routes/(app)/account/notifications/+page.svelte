<script lang="ts">
	import GuardianNotificationSettingsView from '$lib/components/account/GuardianNotificationSettingsView.svelte';
	import StaffNotificationSettingsView from '$lib/components/account/StaffNotificationSettingsView.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { queryNotificationSettingsPage } from '$lib/queries/account.queries';

	const query = queryNotificationSettingsPage();
</script>

<PageQuery {query} loadingTitle={$t('account.notifications.title')}>
	{#snippet children(data)}
		<DataState
			status={data.status}
			errorMessage={data.errorMessage}
			emptyTitle={$t('account.notifications.title')}
			emptyDescription={$t('account.notifications.unavailable')}
		>
			{#if data.kind === 'guardian'}
				<GuardianNotificationSettingsView {data} />
			{:else if data.kind === 'staff'}
				<StaffNotificationSettingsView {data} />
			{:else}
				<p class="p-6 text-sm text-muted-foreground">{$t('account.notifications.unavailable')}</p>
			{/if}
		</DataState>
	{/snippet}
</PageQuery>
