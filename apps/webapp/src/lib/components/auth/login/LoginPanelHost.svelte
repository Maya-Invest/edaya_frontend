<script lang="ts">
	import type { LoginMethodId } from '$lib/auth/login-methods';
	import { ENABLED_LOGIN_METHODS } from '$lib/auth/login-methods';
	import LoginEmailOtpPanel from '$lib/components/auth/login/LoginEmailOtpPanel.svelte';
	import LoginMethodPicker from '$lib/components/auth/login/LoginMethodPicker.svelte';
	import LoginPasswordPanel from '$lib/components/auth/login/LoginPasswordPanel.svelte';

	interface Props {
		activeMethod: LoginMethodId;
		email: string;
		apiConnected: boolean;
		stage?: 'form' | 'code';
		onMethodChange: (method: LoginMethodId) => void;
		onStageChange?: (stage: 'form' | 'code') => void;
	}

	let {
		activeMethod,
		email = $bindable(''),
		apiConnected,
		stage = 'form',
		onMethodChange,
		onStageChange,
	}: Props = $props();

	function handleMethodChange(method: LoginMethodId) {
		onMethodChange(method);
	}
</script>

<LoginMethodPicker activeMethod={activeMethod} onSelect={handleMethodChange} />

{#each ENABLED_LOGIN_METHODS as method (method.id)}
	<div hidden={activeMethod !== method.id} inert={activeMethod !== method.id}>
		{#if method.id === 'password'}
			<LoginPasswordPanel bind:email {apiConnected} />
		{:else if method.id === 'email-otp'}
			<LoginEmailOtpPanel bind:email {apiConnected} {stage} {onStageChange} />
		{/if}
	</div>
{/each}
