<script lang="ts">
	import type { Snippet } from 'svelte';
	import NotificationSettings from '$lib/smart-components/account-notifications/NotificationSettings.svelte';

	const { children }: { children: Snippet } = $props();
</script>
<NotificationSettings />
{@render children()}
