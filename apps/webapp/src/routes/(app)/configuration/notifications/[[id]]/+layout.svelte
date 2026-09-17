<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
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
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const href = `${appPath('/(app)/configuration/notifications/[[id]]')}${next.search}` as ResolvedPathname;
		appGoto(href);
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
