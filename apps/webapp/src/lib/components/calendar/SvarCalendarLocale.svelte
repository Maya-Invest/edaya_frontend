<script lang="ts">
	import type { Lang } from '$lib/i18n';
	import type { Snippet } from 'svelte';
	import { en as calendarEn } from '@svar-ui/calendar-locales';
	import calendarFr from '@svar-ui/calendar-locales/fr.js';
	import { en as coreEn, fr as coreFr } from '@svar-ui/core-locales';
	import { locale as createLocale } from '@svar-ui/lib-dom';
	import { setContext } from 'svelte';

	const { lang, children, weekStart }: { lang: Lang; children: Snippet; weekStart?: number } = $props();

	// Parent remounts this component with {#key lang} when locale changes.
	// svelte-ignore state_referenced_locally
	const words = lang === 'fr' ? { ...coreFr, ...calendarFr } : { ...coreEn, ...calendarEn };
	// svelte-ignore state_referenced_locally
	if (weekStart !== undefined)
		words.calendar = { ...words.calendar, weekStart };
	setContext('wx-i18n', createLocale(words));
</script>

{@render children()}
