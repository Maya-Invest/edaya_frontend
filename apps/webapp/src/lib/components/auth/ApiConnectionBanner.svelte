<script lang="ts">
	import { isLocalDevApi } from '$lib/env/app-env';
	import { t } from '$lib/i18n';

	interface Props {
		connected: boolean;
	}

	const { connected }: Props = $props();
</script>

{#if !connected}
	<p class="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
		{#if isLocalDevApi()}
			{$t('auth.apiUnavailableLocal')}
		{:else}
			{$t('auth.apiUnavailableRemote')}
		{/if}
	</p>
{/if}
