import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const authOrigin = process.env.AUTH_URL ?? 'http://localhost:9900';
const apiOrigin = process.env.API_URL ?? 'http://localhost:9999';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5174,
		proxy: {
			'/core': { target: apiOrigin, changeOrigin: true },
			'/auth': { target: authOrigin, changeOrigin: true },
			'/public': { target: apiOrigin, changeOrigin: true },
			'/doc': { target: apiOrigin, changeOrigin: true },
			'/reference': { target: apiOrigin, changeOrigin: true },
			'/graphql': { target: apiOrigin, changeOrigin: true },
			'/graphiql': { target: apiOrigin, changeOrigin: true },
		},
	},
});
