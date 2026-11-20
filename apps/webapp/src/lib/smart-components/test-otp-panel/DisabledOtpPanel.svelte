<script lang="ts">
	import type { PrimaryStatus } from '$lib/auth/client';

	// eslint-disable-next-line no-unused-vars, unused-imports/no-unused-vars -- This empty release component accepts the testing component’s props.
	const props: { primary: PrimaryStatus | null; busy: boolean; now: number } = $props();
</script>
