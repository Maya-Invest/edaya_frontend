<script lang="ts">
	import type { PrimaryStatus } from '$lib/auth/client';
	import { authRequest } from '$lib/auth/client';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { testOtpAvailable } from './capabilities';

	const { primary, busy, now }: { primary: PrimaryStatus | null; busy: boolean; now: number } = $props();
	let available = $state(false);
	let otp = $state('');
	let loading = $state(false);
	let failed = $state(false);
	let copied = $state(false);
	let generation = 0;
	let visible = $state(true);
	let currentChallenge: string | undefined;
	const pending = $derived(primary?.lifecycle === 'pending' && primary.expiresAt > now);
	function clear() {
		generation++;
		otp = '';
		loading = false;
		failed = false;
		copied = false;
	}
	$effect(() => {
		const challenge = primary?.challenge;
		const usable = pending && !busy && visible;
		if (challenge !== currentChallenge || !usable)
			clear();
		currentChallenge = challenge;
	});
	onMount(() => {
		visible = document.visibilityState === 'visible';
		let alive = true;
		void testOtpAvailable().then((value) => {
			if (alive)
				available = value;
		});
		const hide = () => {
			visible = document.visibilityState === 'visible';
			clear();
		};
		document.addEventListener('visibilitychange', hide);
		window.addEventListener('pagehide', clear);
		return () => {
			alive = false;
			clear();
			document.removeEventListener('visibilitychange', hide);
			window.removeEventListener('pagehide', clear);
		};
	});
	async function reveal() {
		if (!primary || !pending || busy || !visible || loading)
			return;
		const challenge = primary.challenge;
		const version = ++generation;
		loading = true;
		failed = false;
		const { data } = await authRequest<{ challenge: string; otp: string; channel: string; expiresAt: number }>('testing/otp', { challenge });
		if (version !== generation || challenge !== primary?.challenge || !pending || busy || !visible)
			return;
		loading = false;
		if (data?.challenge === challenge && data.expiresAt > now)
			otp = data.otp;
		else failed = true;
	}
	async function copy() {
		const version = generation;
		try {
			await navigator.clipboard.writeText(otp);
			if (version === generation)
				copied = true;
		}
		catch {
			if (version === generation)
				failed = true;
		}
	}
</script>

{#if available && pending && visible}
	<div class="space-y-2 rounded-xl border border-dashed p-3" data-testid="auth-testing-panel">
		<p class="text-xs text-muted-foreground">{$t('auth.testingOnly')}</p>
		<Button type="button" variant="outline" data-testid="auth-test-reveal" disabled={busy || loading} onclick={() => void reveal()}>{$t('auth.showTestCode')}</Button>
		{#if otp}
			<div data-sensitive class="flex items-center gap-3"><code data-testid="auth-test-code" class="select-all">{otp}</code><Button type="button" variant="outline" data-testid="auth-test-copy" onclick={() => void copy()}>{$t('auth.copyTestCode')}</Button></div>
		{/if}
		{#if copied}<p role="status">{$t('auth.testCodeCopied')}</p>{/if}
		{#if failed}<p role="status">{$t('auth.testCodeUnavailable')}</p>{/if}
	</div>
{/if}
