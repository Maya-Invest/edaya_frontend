<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';

	import { onMount } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import MessagesView from './components/MessagesView.svelte';
	import { MessagesPageState } from './messages-page.svelte';

	const { children: pageChildren }: { children: Snippet } = $props();
	const state = new MessagesPageState(() => $page.url);
	onMount(() => {
		const refresh = () => {
			if (!document.hidden)
				void state.refresh();
		};
		const timer = setInterval(refresh, 15000);
		document.addEventListener('visibilitychange', refresh);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', refresh);
			state.clear();
		};
	});
	function navigate(id: string | undefined = undefined, changes: Record<string, string> = {}) {
		const url = new SvelteURL($page.url);
		url.searchParams.delete('offset');
		// Preserve old links as an optional type filter, not a separate inbox.
		if (!url.searchParams.has('type') && ['school', 'teacher'].includes(url.searchParams.get('view') ?? ''))
			url.searchParams.set('type', url.searchParams.get('view')!);
		url.searchParams.delete('view');
		url.pathname = `/school/messages${id ? `/${encodeURIComponent(id)}` : ''}`;
		for (const [key, value] of Object.entries(changes ?? {})) {
			if (value)
				url.searchParams.set(key, value);
			else url.searchParams.delete(key);
		}
		const destination = id ? `/school/messages/${encodeURIComponent(id)}${url.search}` : `/school/messages${url.search}`;
		void goto(resolve(destination as `/school/messages${string}`));
	}
</script>
{#key state.identity}
	<PageQuery query={state.query} cache={false} cacheKey={state.queryKey} loadingTitle="Messages">
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<MessagesView {state} {navigate} />
				{@render pageChildren()}
			</DataState>
		{/snippet}
	</PageQuery>
{/key}
