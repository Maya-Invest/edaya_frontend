<script lang="ts">
	import { formatLocaleTimestamp } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';

	const { value }: { value?: string } = $props();
	const valid = $derived(value && formatLocaleTimestamp(value, $locale));
	const date = $derived(valid ? new Date(value!) : null);
</script>

{#if date}
	<time datetime={value} class="block text-sm tabular-nums">
		<span class="block">{date.toLocaleDateString($locale, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
		<span class="mt-1 block text-xs text-muted-foreground">{date.toLocaleTimeString($locale, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</span>
	</time>
{:else}
	<span class="text-sm text-muted-foreground">{$t('value.notProvided')}</span>
{/if}
