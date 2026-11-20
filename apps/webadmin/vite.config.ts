import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const apiOrigin = process.env.API_URL ?? 'http://localhost:9999';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5174,
		proxy: {
			'/core': { target: apiOrigin, changeOrigin: true },
			'/auth': { target: apiOrigin, changeOrigin: true },
			'/public': { target: apiOrigin, changeOrigin: true },
			'/doc': { target: apiOrigin, changeOrigin: true },
			'/reference': { target: apiOrigin, changeOrigin: true },
		},
	},
});
