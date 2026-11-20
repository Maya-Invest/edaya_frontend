<script lang="ts">
	import { page } from '$app/stores';
	import { isNotificationTemplateKey } from '$lib/notification-templates/catalog';
	import NotificationTemplateDetail from './components/NotificationTemplateDetail.svelte';

	const templateKey = $derived.by(() => {
		const id = $page.params.id;
		return isNotificationTemplateKey(id) ? id : null;
	});
</script>

{#if templateKey}
	<NotificationTemplateDetail {templateKey} />
{/if}
