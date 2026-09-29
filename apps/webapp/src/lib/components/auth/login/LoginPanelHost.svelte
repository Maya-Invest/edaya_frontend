<script lang="ts">
	import type { LoginMethodId } from '$lib/auth/login-methods';
	import PasswordlessPanel from './PasswordlessPanel.svelte';

	let { email = $bindable(''), apiConnected }: { email: string; apiConnected: boolean; activeMethod?: LoginMethodId; stage?: 'form' | 'code'; onMethodChange?: (method: LoginMethodId) => void; onStageChange?: (stage: 'form' | 'code') => void } = $props();
</script>
<PasswordlessPanel bind:email {apiConnected} />
