<script lang="ts">
	import { isLocalDevApi } from '$lib/env/app-env';
	import { t } from '$lib/i18n';

	interface Props {
		connected: boolean;
		checking?: boolean;
	}

	const { connected, checking = false }: Props = $props();
</script>

{#if checking}
	<p role="status" class="mb-4 rounded-collection bg-muted px-4 py-3 text-sm text-muted-foreground">{$t('auth.checkingConnection')}</p>
{:else if !connected}
	<p role="status" class="mb-4 rounded-collection border border-highlight/25 bg-highlight-soft px-4 py-3 text-sm text-highlight">
		{#if isLocalDevApi()}
			{$t('auth.apiUnavailableLocal')}
		{:else}
			{$t('auth.apiUnavailableRemote')}
		{/if}
	</p>
{/if}
