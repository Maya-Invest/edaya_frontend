import { mock } from 'bun:test';

function resolvePath(route: string, params: Record<string, string | undefined> = {}): string {
	return route
		.replace(/\/\([^)]+\)/g, '')
		.replace(/\[\[[^\]]*\]\]/g, '')
		.replace(/\[([^\]]+)\]/g, (_, key: string) => params[key] ?? '');
}

mock.module('$env/static/public', () => ({
	PUBLIC_API_URL: 'http://localhost:8787',
	PUBLIC_APP_ENV: 'test',
	PUBLIC_ALLOW_SCHOOL_REGISTRATION: undefined,
}));

mock.module('$app/environment', () => ({
	browser: false,
	dev: true,
	building: false,
	version: 'test',
}));

mock.module('$app/navigation', () => ({
	goto: () => Promise.resolve(),
	invalidate: () => Promise.resolve(),
	invalidateAll: () => Promise.resolve(),
	beforeNavigate: () => {},
	afterNavigate: () => {},
	disableScrollHandling: () => {},
}));

mock.module('$app/paths', () => ({
	base: '',
	assets: '',
	resolve: resolvePath,
}));
