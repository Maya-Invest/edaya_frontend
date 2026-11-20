<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';

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
		if (id && id !== state.selectedId)
			openDetailDrawer(destination, listSurfaceHref('/school/messages', $page.url));
		else if (!id && state.selectedId)
			closeDetailDrawer(destination);
		else
			void appGoto(destination, { keepFocus: true, noScroll: true });
	}
</script>
{#key state.identity}
	<MessagesView {state} {navigate} />
	{@render pageChildren()}
{/key}
