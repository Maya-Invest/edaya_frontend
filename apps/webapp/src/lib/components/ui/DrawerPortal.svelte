<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getAllContexts, mount, onMount, unmount } from 'svelte';
	import DrawerPortalContent from './DrawerPortalContent.svelte';

	const { children }: { children: Snippet } = $props();
	const context = getAllContexts();

	onMount(() => {
		const instance = mount(DrawerPortalContent, {
			target: document.body,
			context,
			props: { children },
			intro: true,
		});
		// Route-driven teardown must keep the modal and its focus scope alive
		// until both global outro transitions have finished.
		return () => {
			void unmount(instance, { outro: true });
		};
	});
</script>
