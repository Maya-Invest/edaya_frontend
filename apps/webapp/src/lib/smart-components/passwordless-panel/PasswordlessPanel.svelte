<script lang="ts">
	import TermsAcceptance from '$lib/components/auth/TermsAcceptance.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { lang, t } from '$lib/i18n';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import TestOtpPanel from '$testOtpPanel';
	import { onMount, onDestroy, untrack } from 'svelte';
	import { PasswordlessPanelState, completePasswordlessSignIn } from './passwordless-panel-state.svelte';

	let { email = $bindable(''), apiConnected = true, onComplete = completePasswordlessSignIn, enroll = false, link = false, guard = false }:
		{ email?: string; apiConnected?: boolean; onComplete?: () => Promise<unknown>; enroll?: boolean; link?: boolean; guard?: boolean } = $props();
	let recoveryEligible = $state(false);
	const phoneInput = $derived(/^[+\d(]/.test(email.trim()) && !email.includes('@'));
	let container: HTMLDivElement;
	const flow = new PasswordlessPanelState();
	const uid = $props.id();
	$effect(() => {
		flow.setIdentity(email);
	});
	$effect(() => {
		const locale = $lang;
		if (!enroll && !link) {
			untrack(() => {
				void flow.loadTerms(locale);
			});
		}
	});
	const unregister = getDirtyWork()?.register({
		isDirty: () => guard && (email.length > 0 || flow.state !== 'form'),
		discard: () => {
			flow.reset();
			email = '';
		},
	});
	onDestroy(() => unregister?.());
	onMount(() => {
		void flow.loadMethods();
		let ticks = 0;
		const timer = setInterval(() => {
			flow.now = Date.now();
			if (++ticks % 3 === 0 && document.visibilityState === 'visible' && container?.getClientRects().length)
				void flow.poll();
		}, 1000);
		return () => {
			clearInterval(timer);
			flow.reset();
		};
	});
	async function completed() {
		if (guard) {
			flow.reset();
			email = '';
		}
		await onComplete();
	}
	function submit() {
		void flow.submit({ email, locale: $lang, recoveryEligible, enroll, link, onComplete: completed });
	}
</script>

<div bind:this={container} class="space-y-4" data-testid="auth-panel" data-purpose={enroll ? 'enroll' : link ? 'link' : 'login'} data-state={flow.state} data-challenge={flow.challenge}>
	{#if flow.error}<p role="alert" class="text-sm text-destructive">{flow.error}</p>{/if}
	{#if flow.retryRequest}<div class="flex flex-wrap gap-2"><Button data-testid="auth-retry" variant="outline" disabled={flow.busy || !apiConnected} onclick={() => void flow.retry(completed)}>{$t('auth.retryRequest')}</Button><Button data-testid="auth-change-contact" variant="link" disabled={flow.busy} onclick={() => flow.reset()}>{$t('auth.changeContact')}</Button></div>{/if}
	{#if flow.state === 'recovery_codes'}
		<p>{$t('auth.saveRecoveryCodes')}</p>
		<pre data-sensitive data-testid="auth-recovery-codes" class="overflow-x-auto rounded-collection bg-secondary p-3 text-xs">{flow.recoveryCodes.join('\n')}</pre>
		<Button onclick={() => void flow.finish()}>{$t('auth.savedRecoveryCodes')}</Button>
	{:else}
		<form class="space-y-4" onsubmit={(event) => {
			event.preventDefault();
			submit();
		}} aria-busy={flow.busy}>
			{#if flow.state === 'form' && !enroll}
				<Label for={`${uid}-identifier`}>{$t(flow.phoneAvailable ? 'auth.contactLabel' : 'auth.emailLabel')}</Label>
				<Input data-testid="auth-identifier" id={`${uid}-identifier`} type="text" inputmode="email" bind:value={email} autocomplete="username" autocapitalize="none" spellcheck={false} required disabled={flow.busy || !!flow.retryRequest} />
				{#if flow.phoneAvailable && phoneInput}<p class="text-xs text-muted-foreground">{$t('auth.phoneCountryHint')}</p>{/if}
				{#if link}<label class="flex gap-2 text-sm"><input type="checkbox" bind:checked={recoveryEligible} />{$t('auth.recoveryEligible')}</label>{/if}
			{:else if flow.state !== 'form'}
				{#if flow.state === 'enrollment_required'}
					<p>{$t('auth.authenticatorSetup')}</p><code data-sensitive data-testid="auth-totp-secret" class="block break-all select-all">{flow.secret}</code>
				{/if}
				<Label for={`${uid}-code`}>{$t(flow.recovery ? 'auth.recoveryCode' : flow.state === 'totp_required' ? 'auth.authenticatorCode' : 'auth.otpLabel')}</Label>
				<Input data-testid="auth-code" id={`${uid}-code`} bind:value={flow.code} autocomplete="one-time-code" required disabled={flow.busy} />
			{/if}
			{#if flow.state === 'form' && !enroll && !link}
				<TermsAcceptance {flow} disabled={flow.busy || !!flow.retryRequest} onRetry={() => void flow.loadTerms($lang)} />
			{/if}
			<Button data-testid="auth-submit" class="w-full" type="submit" disabled={flow.busy || !apiConnected || (flow.state === 'form' && !enroll && !link && !flow.termsReady) || (flow.state === 'primary_required' && flow.primary?.lifecycle !== 'pending')}>{$t(flow.state === 'form' ? enroll ? 'auth.enableAuthenticator' : 'auth.sendCode' : 'auth.verifyCode')}</Button>
		</form>
		{#if flow.state === 'totp_required'}<Button variant="link" onclick={() => {
			flow.recovery = !flow.recovery;
			flow.code = '';
		}}>{$t(flow.recovery ? 'auth.useAuthenticator' : 'auth.useRecoveryCode')}</Button>{/if}
		{#if flow.state === 'primary_required'}
			<TestOtpPanel primary={flow.primary} busy={flow.busy} now={flow.now + flow.clockOffset} />
			<p class="text-sm text-muted-foreground">{$t(`auth.delivery.${flow.primary?.channel ?? 'email'}`)}</p>
			<p class="text-sm">{$t('auth.latestCode')}</p>
			{#if flow.primary?.delivery === 'failed' || flow.primary?.delivery === 'uncertain'}<p role="status" class="text-sm">{$t(`auth.delivery.${flow.primary.delivery}`)}</p>{/if}
			{#if flow.primary?.lifecycle === 'expired'}<p role="status" class="text-sm">{$t('auth.codeExpired')}</p>{/if}
			{#if flow.secondsRemaining > 0}<p role="status" class="text-sm text-muted-foreground">{$t('auth.resendCountdown', { seconds: flow.secondsRemaining })}</p>{/if}
			<div class="flex flex-wrap gap-2">
				<Button data-testid="auth-resend" variant="link" disabled={!flow.canResend} onclick={() => void flow.resend('resend', completed)}>{$t('auth.resendCode')}</Button>
				{#if flow.primary?.actions.sms}<Button data-testid="auth-sms" variant="link" disabled={!flow.canSms} onclick={() => void flow.resend('sms', completed)}>{$t('auth.sendBySms')}</Button>{/if}
				<Button data-testid="auth-change-contact" variant="link" disabled={flow.busy} onclick={() => flow.reset()}>{$t('auth.changeContact')}</Button>
			</div>
		{/if}
	{/if}
</div>
