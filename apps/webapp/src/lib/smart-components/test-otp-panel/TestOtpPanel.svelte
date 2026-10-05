<script lang="ts">
	import type { PrimaryStatus } from '$lib/auth/client';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { TestOtpPanelState } from './test-otp-panel-state.svelte';

	const { primary, busy, now }: { primary: PrimaryStatus | null; busy: boolean; now: number } = $props();
	const state = new TestOtpPanelState(() => primary, () => busy, () => now);
	$effect(() => state.synchronize());
	onMount(() => state.mount());
</script>

{#if state.available && state.pending && state.visible}
	<div class="space-y-2 rounded-xl border border-dashed p-3" data-testid="auth-testing-panel">
		<p class="text-xs text-muted-foreground">{$t('auth.testingOnly')}</p>
		<Button type="button" variant="outline" data-testid="auth-test-reveal" disabled={busy || state.loading} onclick={() => void state.reveal()}>{$t('auth.showTestCode')}</Button>
		{#if state.otp}
			<div data-sensitive class="flex items-center gap-3"><code data-testid="auth-test-code" class="select-all">{state.otp}</code><Button type="button" variant="outline" data-testid="auth-test-copy" onclick={() => void state.copy()}>{$t('auth.copyTestCode')}</Button></div>
		{/if}
		{#if state.copied}<p role="status">{$t('auth.testCodeCopied')}</p>{/if}
		{#if state.failed}<p role="status">{$t('auth.testCodeUnavailable')}</p>{/if}
	</div>
{/if}
