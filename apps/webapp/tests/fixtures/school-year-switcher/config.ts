import type { InlineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export function yearSwitcherFixtureConfig(root: string): InlineConfig {
	const fixture = `${root}/tests/fixtures/school-year-switcher`;
	const mocks = ['$app/paths', '$app/stores', '$lib/api/private-image', '$lib/auth/session.svelte', '$lib/auth/switch-school', '$lib/navigation/app-navigation', '$lib/shell/message-count.svelte'];
	return { configFile: false, root, publicDir: `${root}/static`, cacheDir: 'node_modules/.vite-school-year-switcher',
		optimizeDeps: { entries: [`${fixture}/Harness.svelte`], include: ['bits-ui', 'lucide-svelte', 'tailwind-merge'] },
		plugins: [{ name: 'school-year-switcher-fixture', enforce: 'pre',
			resolveId(source) {
				if (mocks.includes(source)) return `${fixture}/environment.svelte.ts`;
				if (source === '$app/environment') return '\0year-environment';
				if (source === 'virtual:year-entry') return '\0year-entry';
			},
			load(id) {
				if (id === '\0year-environment') return 'export const browser = true; export const dev = true;';
				if (id === '\0year-entry') return `import '/src/app.css'; import {mount} from 'svelte'; import Harness from '/tests/fixtures/school-year-switcher/Harness.svelte'; mount(Harness,{target:document.getElementById('app')});`;
			},
			configureServer(vite) {
				vite.middlewares.use((request, response, next) => {
					if (!request.url?.startsWith('/year-switcher')) return next();
					response.setHeader('Content-Type', 'text/html');
					response.end('<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><body><div id="app"></div><script type="module" src="/@id/virtual:year-entry"></script></body></html>');
				});
			},
		}, svelte({ configFile: false })],
		resolve: { alias: [...mocks.map(find => ({ find, replacement: `${fixture}/environment.svelte.ts` })), { find: '$lib', replacement: `${root}/src/lib` }] },
		server: { fs: { allow: [root, `${root}/../..`] } },
	};
}
