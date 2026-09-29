<script lang="ts">
	import { authClient } from '$lib/auth/client';
	import { completeAuthSignIn } from '$lib/auth/complete-sign-in';
	import { PasswordlessFlow } from '$lib/auth/passwordless-flow.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';

	let { email = $bindable(''), apiConnected = true, onComplete = () => completeAuthSignIn(''), enroll = false, link = false }:
		{ email?: string; apiConnected?: boolean; onComplete?: () => Promise<unknown>; enroll?: boolean; link?: boolean } = $props();
	let recoveryEligible = $state(false);
	let channel = $state<'email' | 'telegram' | 'whatsapp'>('email');
	const flow = new PasswordlessFlow();
	const uid = $props.id();
	function submit() {
		void flow.run(() => {
			if (flow.state === 'form')
				return enroll ? authClient.enroll() : link ? authClient.linkIdentifier({ kind: channel === 'email' ? 'email' : 'phone', value: email, channel, recoveryEligible }) : authClient.startOtp({ kind: channel === 'email' ? 'email' : 'phone', value: email, channel });
			if (flow.state === 'primary_required')
				return authClient.verifyOtp(flow.challenge, flow.code);
			if (flow.state === 'enrollment_required')
				return authClient.confirmEnrollment(flow.challenge, flow.code);
			return flow.recovery ? authClient.recover(flow.challenge, flow.code) : authClient.verifyTotp(flow.challenge, flow.code);
		}, onComplete);
	}
</script>

<div class="space-y-4" data-testid="auth-panel" data-purpose={enroll ? 'enroll' : link ? 'link' : 'login'} data-state={flow.state}>
	{#if flow.error}<p role="alert" class="text-sm text-destructive">{flow.error}</p>{/if}
	{#if flow.state === 'recovery_codes'}
		<p>{$t('auth.saveRecoveryCodes')}</p>
		<pre data-sensitive data-testid="auth-recovery-codes" class="overflow-x-auto rounded-xl bg-secondary p-3 text-xs">{flow.recoveryCodes.join('\n')}</pre>
		<Button onclick={() => void flow.finish()}>{$t('auth.savedRecoveryCodes')}</Button>
	{:else}
		<form class="space-y-4" onsubmit={(event) => {
			event.preventDefault();
			submit();
		}} aria-busy={flow.busy}>
			{#if flow.state === 'form' && !enroll}
				<Label for={`${uid}-channel`}>{$t('auth.deliveryChannel')}</Label>
				<select id={`${uid}-channel`} bind:value={channel} disabled={flow.busy} class="w-full rounded-xl border border-input bg-background p-3">
					<option value="email">{$t('auth.emailLabel')}</option><option value="telegram">Telegram</option><option value="whatsapp">WhatsApp</option>
				</select>
				<Label for={`${uid}-identifier`}>{$t(channel === 'email' ? 'auth.emailLabel' : 'auth.phoneLabel')}</Label>
				<Input data-testid="auth-identifier" id={`${uid}-identifier`} type={channel === 'email' ? 'email' : 'tel'} bind:value={email} autocomplete={channel === 'email' ? 'email' : 'tel'} required disabled={flow.busy} />
				{#if channel !== 'email'}<p class="text-xs text-muted-foreground">{$t('auth.phoneCountryHint')}</p>{/if}
				{#if link}<label class="flex gap-2 text-sm"><input type="checkbox" bind:checked={recoveryEligible} />{$t('auth.recoveryEligible')}</label>{/if}
			{:else if flow.state !== 'form'}
				{#if flow.state === 'enrollment_required'}
					<p>{$t('auth.authenticatorSetup')}</p><code data-sensitive data-testid="auth-totp-secret" class="block break-all select-all">{flow.secret}</code>
				{/if}
				<Label for={`${uid}-code`}>{$t(flow.recovery ? 'auth.recoveryCode' : flow.state === 'totp_required' ? 'auth.authenticatorCode' : 'auth.otpLabel')}</Label>
				<Input data-testid="auth-code" id={`${uid}-code`} bind:value={flow.code} autocomplete="one-time-code" required disabled={flow.busy} />
			{/if}
			<Button data-testid="auth-submit" class="w-full" type="submit" disabled={flow.busy || !apiConnected}>{$t(flow.state === 'form' ? enroll ? 'auth.enableAuthenticator' : 'auth.sendCode' : 'auth.verifyCode')}</Button>
		</form>
		{#if flow.state === 'totp_required'}<Button variant="link" onclick={() => {
			flow.recovery = !flow.recovery;
			flow.code = '';
		}}>{$t(flow.recovery ? 'auth.useAuthenticator' : 'auth.useRecoveryCode')}</Button>{/if}
		{#if flow.state === 'primary_required'}<Button variant="link" disabled={flow.busy} onclick={() => flow.reset()}>{$t('auth.resendCode')}</Button>{/if}
	{/if}
</div>
