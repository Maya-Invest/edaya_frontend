<script lang="ts">
	import type { LoginMethodId } from '$lib/auth/login-methods';
	import LoginEmailOtpPanel from '$lib/components/auth/login/LoginEmailOtpPanel.svelte';
	import LoginMethodPicker from '$lib/components/auth/login/LoginMethodPicker.svelte';
	import LoginPasswordPanel from '$lib/components/auth/login/LoginPasswordPanel.svelte';

	interface Props {
		activeMethod: LoginMethodId;
		email: string;
		apiConnected: boolean;
		onMethodChange: (method: LoginMethodId) => void;
	}

	let { activeMethod, email = $bindable(''), apiConnected, onMethodChange }: Props = $props();

	let emailOtpPanel = $state<LoginEmailOtpPanel | undefined>();

	function handleMethodChange(method: LoginMethodId) {
		if (method !== 'email-otp') {
			emailOtpPanel?.reset();
		}
		onMethodChange(method);
	}
</script>

<LoginMethodPicker activeMethod={activeMethod} onSelect={handleMethodChange} />

{#if activeMethod === 'password'}
	<LoginPasswordPanel bind:email {apiConnected} />
{:else if activeMethod === 'email-otp'}
	<LoginEmailOtpPanel bind:this={emailOtpPanel} bind:email {apiConnected} />
{/if}

<!-- Future sign-in methods (OAuth, magic link, etc.) plug in here. -->
