import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const apiOrigin = process.env.API_URL ?? 'http://localhost:9999';
const webappRoot = path.dirname(fileURLToPath(import.meta.url));
const apiClientSrc = path.resolve(
	webappRoot,
	'../../../edaya_backend/package/api-client/src/index.ts',
);

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		// Use API client source in dev so new routes (e.g. onboarding.provision) are picked up
		// without depending on a stale Vite-prebundled dist copy.
		alias: {
			'@maya-invest/edaya-api-client': apiClientSrc,
		},
	},
	optimizeDeps: {
		exclude: ['@maya-invest/edaya-api-client'],
	},
	ssr: {
		noExternal: ['@maya-invest/edaya-api-client'],
	},
	server: {
		proxy: {
			'/core': { target: apiOrigin, changeOrigin: true },
			'/auth': { target: apiOrigin, changeOrigin: true },
			'/public': { target: apiOrigin, changeOrigin: true },
			'/doc': { target: apiOrigin, changeOrigin: true },
			'/reference': { target: apiOrigin, changeOrigin: true },
			'/graphql': { target: apiOrigin, changeOrigin: true },
			'/graphiql': { target: apiOrigin, changeOrigin: true },
		},
	},
});
