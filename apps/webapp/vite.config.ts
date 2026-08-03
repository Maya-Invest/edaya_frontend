import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const apiOrigin = process.env.API_URL ?? 'http://localhost:9999';
const webappRoot = path.dirname(fileURLToPath(import.meta.url));
/** Sibling checkout: `maya_invest/edaya_backend` next to `edaya_web`. */
const siblingApiClientSrc = path.resolve(
	webappRoot,
	'../../../edaya_backend/package/api-client/src/index.ts',
);
/** Optional in-repo symlink: `edaya_web/edaya_backend` → `../edaya_backend`. */
const linkedApiClientSrc = path.resolve(
	webappRoot,
	'../../edaya_backend/package/api-client/src/index.ts',
);
const apiClientSrc = [siblingApiClientSrc, linkedApiClientSrc].find(candidate =>
	existsSync(candidate),
);

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		// Local/dev only: resolve to backend source so new routes are picked up without a
		// stale Vite-prebundled dist. CI has no edaya_backend checkout — use the published
		// package from node_modules instead.
		alias: apiClientSrc
			? {
					'@maya-invest/edaya-api-client': apiClientSrc,
				}
			: {},
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
