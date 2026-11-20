<script lang="ts">
	import type { Snippet } from 'svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import { untrack } from 'svelte';
	import { getFamilyFeedbackPageState } from '../family-feedback-page.svelte';

	const { children, includeAssignments = false }: { children: Snippet; includeAssignments?: boolean } = $props();
	const feedback = getFamilyFeedbackPageState();
	let attempt = $state(0);

	$effect(() => {
		void attempt;
		void feedback.optionScope;
		const withAssignments = includeAssignments;
		const controller = new AbortController();
		untrack(() => void feedback.loadOptions(withAssignments, controller.signal));
		return () => {
			controller.abort();
			feedback.clearOptions();
		};
	});
</script>

<DataState status={feedback.optionsStatus} compact onRetry={() => attempt++}>
	{@render children()}
</DataState>
