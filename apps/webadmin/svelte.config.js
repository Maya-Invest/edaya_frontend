import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		experimental: {
			async: true,
		},
	},
	kit: {
		paths: {
			relative: false,
		},
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '200.html',
			strict: false,
		}),
		prerender: {
			handleUnseenRoutes: 'ignore',
		},
	},
};

export default config;
