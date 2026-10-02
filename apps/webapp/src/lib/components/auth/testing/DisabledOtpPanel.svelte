<script lang="ts">
	import type { PrimaryStatus } from '$lib/auth/client';

	const props: { primary: PrimaryStatus | null; busy: boolean; now: number } = $props();
	void props;
</script>
