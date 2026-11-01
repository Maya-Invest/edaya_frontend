import type { InlineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export function timetableFixtureConfig() {
	const appRoot = new URL('../../..', import.meta.url).pathname;
	const fixture = `${appRoot}/tests/fixtures/timetable-modal`;
	return {
		configFile: false,
		root: appRoot,
		// The full runner also serves the demo app from this root. Keep its
		// dependency cache separate and avoid a reload during fixture interaction.
		cacheDir: 'node_modules/.vite-timetable-selection',
		optimizeDeps: {
			entries: [`${fixture}/Harness.svelte`],
			include: ['@maya-invest/edaya-api-client', 'bits-ui', 'lucide-svelte', 'tailwind-merge'],
		},
		plugins: [{
			name: 'timetable-modal-fixture',
			enforce: 'pre',
			resolveId(source) {
				if (source.includes('tools-page.svelte'))
					return `${fixture}/action-state.ts`;
				if (source === '$lib/auth/session.svelte' || source.endsWith('/lib/auth/session.svelte'))
					return '\0fixture-auth';
				if (source === '$app/environment')
					return '\0fixture-environment';
				if (source === 'virtual:timetable-entry')
					return '\0fixture-entry';
			},
			load(id) {
				if (id === '\0fixture-auth')
					return 'export const authSession = { subjectId: \'fixture-user\', schoolId: \'school\', grants: [] };';
				if (id === '\0fixture-environment')
					return 'export const browser = true;';
				if (id === '\0fixture-entry')
					return `import '/src/app.css'; import {mount} from 'svelte'; import Harness from '/tests/fixtures/timetable-modal/Harness.svelte'; mount(Harness,{target:document.getElementById('app')});`;
			},
			configureServer(vite) {
				vite.middlewares.use('/timetable-fixture', (_request, response) => {
					response.setHeader('Content-Type', 'text/html');
					response.end('<!doctype html><html><body><div id="app"></div><script type="module" src="/@id/virtual:timetable-entry"></script></body></html>');
				});
			},
		}, svelte({ configFile: false })],
		resolve: { alias: [{ find: '$lib/academic/context.svelte', replacement: `${fixture}/academic-context.svelte.ts` }, { find: '$lib', replacement: `${appRoot}/src/lib` }] },
		server: { fs: { allow: [appRoot, `${appRoot}/../..`] } },
	} satisfies InlineConfig;
}
