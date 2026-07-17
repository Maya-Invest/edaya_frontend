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
	}

	let { email = $bindable(''), apiConnected }: Props = $props();

	let password = $state('');
	let busy = $state(false);

	async function signInWithPassword() {
		const normalizedEmail = email.trim();
		if (!normalizedEmail || !password || !apiConnected) {
			return;
		}

		busy = true;
		try {
			const { error } = await authClient.signIn.email({
				email: normalizedEmail,
				password,
			});

			if (error) {
				toast.error(`${$t('auth.passwordSignInFailed')}: ${error.message ?? ''}`.trim());
				return;
			}

			await completeAuthSignIn($t('auth.welcome'));
		}
		catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`${$t('auth.passwordSignInFailed')}: ${message}`);
		}
		finally {
			busy = false;
		}
	}
</script>

<form
	class="space-y-4"
	onsubmit={(event) => {
		event.preventDefault();
		void signInWithPassword();
	}}
>
	<div class="space-y-2">
		<Label for="login-password-email">{$t('auth.emailLabel')}</Label>
		<Input
			id="login-password-email"
			type="email"
			autocomplete="email"
			placeholder={$t('auth.emailPlaceholder')}
			bind:value={email}
			disabled={busy || !apiConnected}
			required
		/>
	</div>
	<div class="space-y-2">
		<Label for="login-password">{$t('auth.passwordLabel')}</Label>
		<Input
			id="login-password"
			type="password"
			autocomplete="current-password"
			placeholder={$t('auth.passwordPlaceholder')}
			bind:value={password}
			disabled={busy || !apiConnected}
			required
		/>
	</div>
	<Button
		type="submit"
		class="w-full"
		disabled={busy || !apiConnected || !email.trim() || !password}
	>
		{#if busy}
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
		{/if}
		{$t('auth.signInWithPassword')}
	</Button>
</form>
