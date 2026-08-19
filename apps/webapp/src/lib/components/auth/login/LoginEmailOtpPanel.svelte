<script lang="ts">
	import { authClient } from '$lib/auth/client';
	import { completeAuthSignIn } from '$lib/auth/complete-sign-in';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle } from '$lib/icons';
	import { toast } from '$lib/toast.svelte';

	interface Props {
		email: string;
		apiConnected: boolean;
		stage?: 'form' | 'code';
		onStageChange?: (stage: 'form' | 'code') => void;
	}

	let {
		email = $bindable(''),
		apiConnected,
		stage = 'form',
		onStageChange,
	}: Props = $props();

	let otp = $state('');
	let busy = $state(false);

	export function reset() {
		onStageChange?.('form');
		otp = '';
	}

	async function sendOtp() {
		const normalizedEmail = email.trim();
		if (!normalizedEmail || !apiConnected) {
			return;
		}

		busy = true;
		try {
			const { error } = await authClient.emailOtp.sendVerificationOtp({
				email: normalizedEmail,
				type: 'sign-in',
			});

			if (error) {
				toast.error(`${$t('auth.otpSendFailed')}: ${error.message ?? ''}`.trim());
				return;
			}

			otp = '';
			onStageChange?.('code');
			toast.success($t('auth.otpSent', { email: normalizedEmail }));
		}
		catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`${$t('auth.otpSendFailed')}: ${message}`);
		}
		finally {
			busy = false;
		}
	}

	async function verifyOtp() {
		const normalizedEmail = email.trim();
		const normalizedOtp = otp.trim();
		if (!normalizedEmail || !normalizedOtp || !apiConnected) {
			return;
		}

		busy = true;
		try {
			const { error } = await authClient.signIn.emailOtp({
				email: normalizedEmail,
				otp: normalizedOtp,
			});

			if (error) {
				toast.error(`${$t('auth.otpSignInFailed')}: ${error.message ?? ''}`.trim());
				return;
			}

			await completeAuthSignIn($t('auth.welcome'));
		}
		catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`${$t('auth.otpSignInFailed')}: ${message}`);
		}
		finally {
			busy = false;
		}
	}

	function resetFlow() {
		onStageChange?.('form');
		otp = '';
	}
</script>

{#if stage === 'form'}
	<form
		class="space-y-4"
		onsubmit={(event) => {
			event.preventDefault();
			void sendOtp();
		}}
	>
		<div class="space-y-2">
			<Label for="login-otp-email">{$t('auth.emailLabel')}</Label>
			<Input
				id="login-otp-email"
				type="email"
				autocomplete="email"
				placeholder={$t('auth.emailPlaceholder')}
				bind:value={email}
				disabled={busy || !apiConnected}
				required
			/>
			<p class="text-xs text-muted-foreground">{$t('auth.emailHelp')}</p>
		</div>
		<Button type="submit" class="w-full" disabled={busy || !apiConnected || !email.trim()}>
			{#if busy}
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			{/if}
			{$t('auth.sendCode')}
		</Button>
	</form>
{:else}
	<form
		class="space-y-4"
		onsubmit={(event) => {
			event.preventDefault();
			void verifyOtp();
		}}
	>
		<div class="rounded-xl bg-secondary/40 px-4 py-3 text-sm">
			<p class="font-medium">{$t('auth.otpStepTitle')}</p>
			<p class="mt-1 text-muted-foreground">
				{$t('auth.otpSent', { email: email.trim() })}
			</p>
		</div>
		<div class="space-y-2">
			<Label for="login-otp">{$t('auth.otpLabel')}</Label>
			<Input
				id="login-otp"
				type="text"
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength={6}
				placeholder={$t('auth.otpPlaceholder')}
				bind:value={otp}
				disabled={busy || !apiConnected}
				required
			/>
		</div>
		<Button type="submit" class="w-full" disabled={busy || !apiConnected || otp.trim().length < 6}>
			{#if busy}
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			{/if}
			{$t('auth.verifyCode')}
		</Button>
		<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm">
			<button
				type="button"
				class="text-primary hover:underline disabled:opacity-50"
				disabled={busy || !apiConnected}
				onclick={() => void sendOtp()}
			>
				{$t('auth.resendCode')}
			</button>
			<button
				type="button"
				class="text-muted-foreground hover:underline disabled:opacity-50"
				disabled={busy}
				onclick={resetFlow}
			>
				{$t('auth.useDifferentEmail')}
			</button>
		</div>
	</form>
{/if}
