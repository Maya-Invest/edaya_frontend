<script lang="ts">
	import type { Student } from '$lib/types/school';
	import PersonAvatar from './PersonAvatar.svelte';

	const { s, size = 'lg' }: { s: Student; size?: 'list' | 'lg' } = $props();
</script>

<PersonAvatar name={s.name} initials={s.initials} photoUrl={s.photoUrl} {size} />
