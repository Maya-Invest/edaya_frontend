import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import adapter from '@sveltejs/adapter-static';

const testOtpAccess = (process.env.PUBLIC_TEST_OTP_ACCESS ?? loadEnv(process.env.NODE_ENV ?? 'development', fileURLToPath(new URL('.', import.meta.url)), 'PUBLIC_TEST_OTP_ACCESS').PUBLIC_TEST_OTP_ACCESS) === 'true';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		experimental: {
			async: true,
		},
	},
	kit: {
		alias: {
			
			'$tests': 'tests',
			'$testOtpPanel': testOtpAccess ? 'src/lib/components/auth/testing/TestOtpPanel.svelte' : 'src/lib/components/auth/testing/DisabledOtpPanel.svelte',
		},
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
