<script lang="ts">
	import { isExistingAccountAuthError } from '$lib/auth/auth-errors';
	import { getAuthenticatedAuthUser } from '$lib/auth/bootstrap';
	import { authClient } from '$lib/auth/client';
	import { completeAuthSignIn } from '$lib/auth/complete-sign-in';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, Mail } from '$lib/icons';
	import { toast } from '$lib/toast.svelte';

	const MIN_PASSWORD_LENGTH = 8;

	interface Props {
		email?: string;
		apiConnected: boolean;
		onSwitchToSignIn: (email: string) => void;
		stage?: 'form' | 'verification';
		onStageChange?: (stage: 'form' | 'verification') => void;
	}

	let {
		email = $bindable(''),
		apiConnected,
		onSwitchToSignIn,
		stage = 'form',
		onStageChange,
	}: Props = $props();

	let name = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let busy = $state(false);
	let errorMessage = $state<string | null>(null);
	/** Sync re-entry guard — reactive `busy` alone can miss double-submit before DOM disables. */
	let submitting = false;

	const passwordsMatch = $derived(confirmPassword.length === 0 || password === confirmPassword);
	const passwordLongEnough = $derived(password.length === 0 || password.length >= MIN_PASSWORD_LENGTH);
	const canSubmit = $derived(
		apiConnected && !busy && name.trim().length > 0 && email.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword,
	);

	async function finishSignUpAfterAuth(): Promise<boolean> {
		const authUser = await getAuthenticatedAuthUser();
		if (!authUser) {
			return false;
		}
		return completeAuthSignIn($t('auth.signUpSuccess'));
	}

	async function handleSignUp() {
		if (submitting || !canSubmit) {
			return;
		}

		submitting = true;
		busy = true;
		errorMessage = null;
		onStageChange?.('form');

		try {
			const normalizedEmail = email.trim();
			const { error } = await authClient.signUp.email({
				email: normalizedEmail,
				password,
				name: name.trim(),
			});

			if (error) {
				// Parallel submit race: the other request may already have created the session.
				if (await finishSignUpAfterAuth()) {
					return;
				}
				if (isExistingAccountAuthError(error)) {
					toast.error($t('auth.signUpAccountExists'));
					onSwitchToSignIn(normalizedEmail);
					return;
				}
				errorMessage = error.message ?? $t('auth.signUpFailed');
				return;
			}

			if (await finishSignUpAfterAuth()) {
				return;
			}

			onStageChange?.('verification');
			toast.success($t('auth.signUpVerificationSent'));
		}
		catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			errorMessage = `${$t('auth.signUpFailed')}: ${message}`;
		}
		finally {
			submitting = false;
			busy = false;
		}
	}

	function resetVerificationState() {
		onStageChange?.('form');
		password = '';
		confirmPassword = '';
	}
</script>

{#if stage === 'verification'}
	<div class="space-y-4 rounded-xl bg-secondary p-4 text-foreground">
		<div class="flex items-start gap-3">
			<Mail class="mt-0.5 h-5 w-5 shrink-0" />
			<div class="space-y-1.5">
				<p class="font-medium">{$t('auth.signUpVerificationTitle')}</p>
				<p class="text-sm leading-relaxed text-foreground">
					{$t('auth.signUpVerificationHint', { email: email.trim() })}
				</p>
			</div>
		</div>
		<Button
			type="button"
			variant="secondary"
			class="w-full"
			onclick={() => {
				resetVerificationState();
				onSwitchToSignIn(email.trim());
			}}
		>
			{$t('auth.switchToSignIn')}
		</Button>
	</div>
{:else}
	<form
		class="space-y-4"
		aria-busy={busy}
		onsubmit={(event) => {
			event.preventDefault();
			void handleSignUp();
		}}
	>
		<div class="space-y-1.5">
			<Label for="signup-name" class="text-foreground">
				{$t('auth.fullNameLabel')}
			</Label>
			<Input
				id="signup-name"
				type="text"
				autocomplete="name"
				placeholder={$t('auth.fullNamePlaceholder')}
				bind:value={name}
				disabled={busy || !apiConnected}
				required
				class="bg-card"
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="signup-email" class="text-foreground">
				{$t('auth.emailLabel')}
			</Label>
			<Input
				id="signup-email"
				type="email"
				autocomplete="email"
				placeholder={$t('auth.emailPlaceholder')}
				bind:value={email}
				disabled={busy || !apiConnected}
				required
				class="bg-card"
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="signup-password" class="text-foreground">
				{$t('auth.passwordLabel')}
			</Label>
			<Input
				id="signup-password"
				type="password"
				autocomplete="new-password"
				placeholder={$t('auth.passwordPlaceholder')}
				bind:value={password}
				disabled={busy || !apiConnected}
				required
				minlength={MIN_PASSWORD_LENGTH}
				class="bg-card"
			/>
			{#if !passwordLongEnough && password.length > 0}
				<p class="text-xs text-destructive">{$t('auth.signUpPasswordTooShort')}</p>
			{/if}
		</div>

		<div class="space-y-1.5">
			<Label for="signup-confirm-password" class="text-foreground">
				{$t('auth.confirmPasswordLabel')}
			</Label>
			<Input
				id="signup-confirm-password"
				type="password"
				autocomplete="new-password"
				placeholder={$t('auth.confirmPasswordPlaceholder')}
				bind:value={confirmPassword}
				disabled={busy || !apiConnected}
				required
				class="bg-card"
			/>
			{#if !passwordsMatch}
				<p class="text-xs text-destructive">{$t('auth.signUpPasswordMismatch')}</p>
			{/if}
		</div>

		{#if errorMessage}
			<p role="alert" class="text-sm text-destructive">{errorMessage}</p>
		{/if}

		<Button
			type="submit"
			class="w-full"
			disabled={!canSubmit}
		>
			{#if busy}
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			{/if}
			{$t(busy ? 'auth.creatingAccount' : 'auth.signUpSubmit')}
		</Button>
	</form>
{/if}
