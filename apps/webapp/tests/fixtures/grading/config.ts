import { svelte } from '@sveltejs/vite-plugin-svelte';
import type { InlineConfig } from 'vite';

export function gradingFixtureConfig(appRoot: string): InlineConfig {
	const fixture = `${appRoot}/tests/fixtures/grading`;
	const mocks = ['$app/stores', '$lib/academic/context.svelte', '$lib/auth/session.svelte', '$lib/permissions', '$lib/api/school-client', '$lib/api/documents-data', '$lib/api/mutations/documents.mutations', '$lib/navigation/app-navigation'];
	return { configFile: false, root: appRoot, cacheDir: 'node_modules/.vite-grading',
		optimizeDeps: { entries: [`${fixture}/Harness.svelte`], include: ['@maya-invest/edaya-api-client', 'bits-ui', 'lucide-svelte', 'tailwind-merge'] },
		plugins: [{ name: 'grading-fixture', enforce: 'pre',
			resolveId(source) {
				if (mocks.includes(source) || source === './app-navigation') return `${fixture}/environment.svelte.ts`;
				if (source === '$app/environment') return '\0fixture-environment';
				if (source === 'virtual:grading-entry') return '\0fixture-entry';
			},
			load(id) {
				if (id === '\0fixture-environment') return 'export const browser = true;';
				if (id === '\0fixture-entry') return `import '/src/app.css'; import {mount} from 'svelte'; import Harness from '/tests/fixtures/grading/Harness.svelte'; mount(Harness,{target:document.getElementById('app')});`;
			},
			configureServer(vite) {
				vite.middlewares.use((request, response, next) => {
					if (!request.url?.startsWith('/classes/')) return next();
					response.setHeader('Content-Type', 'text/html');
					response.end('<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><body><div id="app"></div><script type="module" src="/@id/virtual:grading-entry"></script></body></html>');
				});
			},
		}, svelte({ configFile: false })],
		resolve: { alias: [...mocks.map(find => ({ find, replacement: `${fixture}/environment.svelte.ts` })), { find: '$lib', replacement: `${appRoot}/src/lib` }] },
		server: { fs: { allow: [appRoot, `${appRoot}/../..`] } },
	};
}
