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
	}

	let { email = $bindable(''), apiConnected, onSwitchToSignIn }: Props = $props();

	let name = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let busy = $state(false);
	let verificationSent = $state(false);

	const passwordsMatch = $derived(confirmPassword.length === 0 || password === confirmPassword);
	const passwordLongEnough = $derived(password.length === 0 || password.length >= MIN_PASSWORD_LENGTH);
	const canSubmit = $derived(
		apiConnected && !busy && name.trim().length > 0 && email.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword,
	);

	async function handleSignUp() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		verificationSent = false;

		try {
			const normalizedEmail = email.trim();
			const { error } = await authClient.signUp.email({
				email: normalizedEmail,
				password,
				name: name.trim(),
			});

			if (error) {
				if (isExistingAccountAuthError(error)) {
					toast.error($t('auth.signUpAccountExists'));
					onSwitchToSignIn(normalizedEmail);
					return;
				}
				toast.error(error.message ?? $t('auth.signUpFailed'));
				return;
			}

			const authUser = await getAuthenticatedAuthUser();
			if (authUser) {
				const signedIn = await completeAuthSignIn($t('auth.signUpSuccess'));
				if (signedIn) {
					return;
				}
			}

			verificationSent = true;
			toast.success($t('auth.signUpVerificationSent'));
		}
		catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`${$t('auth.signUpFailed')}: ${message}`);
		}
		finally {
			busy = false;
		}
	}

	function resetVerificationState() {
		verificationSent = false;
		password = '';
		confirmPassword = '';
	}
</script>

{#if verificationSent}
	<div class="space-y-3 rounded-xl bg-primary-foreground/10 p-4 text-primary-foreground">
		<div class="flex items-start gap-3">
			<Mail class="mt-0.5 h-5 w-5 shrink-0" />
			<div class="space-y-1.5">
				<p class="font-medium">{$t('auth.signUpVerificationTitle')}</p>
				<p class="text-sm leading-relaxed text-primary-foreground/90">
					{$t('auth.signUpVerificationHint', { email: email.trim() })}
				</p>
			</div>
		</div>
		<Button
			type="button"
			variant="secondary"
			class="w-full border-0 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
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
		class="space-y-3"
		onsubmit={(event) => {
			event.preventDefault();
			void handleSignUp();
		}}
	>
		<div class="space-y-1.5">
			<Label for="signup-name" class="text-primary-foreground/90">
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
				class="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50"
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="signup-email" class="text-primary-foreground/90">
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
				class="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50"
			/>
		</div>

		<div class="space-y-1.5">
			<Label for="signup-password" class="text-primary-foreground/90">
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
				class="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50"
			/>
			{#if !passwordLongEnough && password.length > 0}
				<p class="text-xs text-primary-foreground/80">{$t('auth.signUpPasswordTooShort')}</p>
			{/if}
		</div>

		<div class="space-y-1.5">
			<Label for="signup-confirm-password" class="text-primary-foreground/90">
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
				class="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50"
			/>
			{#if !passwordsMatch}
				<p class="text-xs text-primary-foreground/80">{$t('auth.signUpPasswordMismatch')}</p>
			{/if}
		</div>

		<Button
			type="submit"
			class="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
			disabled={!canSubmit}
		>
			{#if busy}
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			{/if}
			{$t('auth.signUpSubmit')}
		</Button>
	</form>
{/if}
