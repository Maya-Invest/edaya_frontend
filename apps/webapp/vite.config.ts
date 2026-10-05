import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const apiOrigin = process.env.API_URL ?? 'http://localhost:9999';
export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['@maya-invest/edaya-api-client'],
	},
	ssr: {
		noExternal: ['@maya-invest/edaya-api-client'],
	},
	server: {
		// Listen on IPv4 and IPv6 so Playwright (`127.0.0.1`) and browsers (`localhost`) both connect.
		host: true,
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
