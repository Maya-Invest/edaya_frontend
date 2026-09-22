<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { isNotificationTemplateKey } from '$lib/notification-templates/catalog';
	import { getNotificationsPageState } from '../notifications-page.svelte';
	import NotificationTemplateDrawer from './components/NotificationTemplateDrawer.svelte';

	const { children }: { children: Snippet } = $props();

	const notificationsPage = getNotificationsPageState();
	const templateKey = $derived.by(() => {
		const id = $page.params.id;
		return isNotificationTemplateKey(id) ? id : undefined;
	});

	function closeDetail() {
		closeDetailDrawer(listSurfaceHref(appPath('/(app)/configuration/notifications/[[id]]'), $page.url));
	}

	$effect(() => {
		const id = $page.params.id;
		if (!id) {
			return;
		}
		if (!isNotificationTemplateKey(id)) {
			closeDetail();
		}
	});
</script>

{#if $page.params.id}
	<NotificationTemplateDrawer
		{templateKey}
		loading={!templateKey || !notificationsPage.document}
		onClose={closeDetail}
	>
		{@render children()}
	</NotificationTemplateDrawer>
{/if}
