import type { Lang } from './dictionaries';
import { browser } from '$app/environment';
import { readPreference, writePreference } from '$lib/preferences/storage';
import { derived, writable } from 'svelte/store';
import { dictionaries } from './dictionaries';

export type { Lang } from './dictionaries';

function initialLang(): Lang {
	if (!browser)
		return 'fr';
	const stored = readPreference('local', 'lang');
	return stored === 'fr' || stored === 'en' ? stored : 'fr';
}

export const lang = writable<Lang>(initialLang());

lang.subscribe((l) => {
	if (browser) {
		writePreference('local', 'lang', l);
		document.documentElement.lang = l;
	}
});

export const locale = derived(lang, $lang => ($lang === 'fr' ? 'fr-FR' : 'en-US'));

function translate($lang: Lang, key: string, vars?: Record<string, string | number>): string {
	let s = dictionaries[$lang][key] ?? dictionaries.en[key] ?? key;
	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			s = s.replace(`{${k}}`, String(v));
		}
	}
	return s;
}

export const t = derived(lang, ($lang) => {
	return (key: string, vars?: Record<string, string | number>) => translate($lang, key, vars);
});

export function setLang(l: Lang) {
	lang.set(l);
}
