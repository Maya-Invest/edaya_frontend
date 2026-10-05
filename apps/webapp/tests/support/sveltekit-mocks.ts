import { mock } from 'bun:test';

function resolvePath(route: string, params: Record<string, string | undefined> = {}): string {
	return route
		.replace(/\/\([^)]+\)/g, '')
		.replace(/\[\[[^\]]*\]\]/g, '')
		.replace(/\[([^\]]+)\]/g, (_, key: string) => params[key] ?? '');
}

function stubSvelteModule(baseSpecifier: string, exports: Record<string, unknown>) {
	mock.module(baseSpecifier, () => exports);
	mock.module(`${baseSpecifier}.ts`, () => exports);
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

function readableStore<T>(value: T) {
	return {
		subscribe(run: (next: T) => void) {
			run(value);
			return () => {};
		},
	};
}

mock.module('$app/stores', () => ({
	page: readableStore({
		url: new URL('http://localhost/'),
		params: {},
		route: { id: null },
		status: 200,
		error: null,
		data: {},
		form: null,
		state: {},
	}),
	navigating: readableStore(null),
	updated: {
		...readableStore(false),
		check: async () => false,
	},
}));

mock.module('$app/paths', () => ({
	base: '',
	assets: '',
	resolve: resolvePath,
}));

stubSvelteModule('$lib/toast.svelte', {
	toast: { success: () => {}, error: () => {}, info: () => {}, push: () => {}, dismiss: () => {}, items: [] },
});

stubSvelteModule('$lib/auth/session.svelte', {
	authSession: {
		schoolId: 'school-1',
		userId: null,
		authUserId: null,
		sessionKind: null,
		subjectId: null,
		loginEmail: null,
		grants: null,
		staffMemberships: [],
		activeStaffMembership: null,
		isLoggedIn: false,
		ready: true,
		userProfile: null,
		setStaffMemberships() {},
		selectStaffMembership() {},
		markLoading() {
			this.ready = false;
		},
		markReady() {
			this.ready = true;
		},
		clear() {
			this.isLoggedIn = false;
		},
		setAuthAccountOnly() {
			this.isLoggedIn = false;
		},
	},
});

stubSvelteModule('$lib/entity-versions.svelte', {
	ENTITY_VERSION_KEYS: [],
	entityVersions: { bump: () => {} },
});

stubSvelteModule('$lib/toast.svelte', {
	toast: {
		success() {},
		info() {},
		error() {},
		dismiss() {},
		push() {},
		items: [],
	},
});

stubSvelteModule('$lib/academic/context.svelte', {
	academicContext: {
		years: [],
		classes: [],
		gradeLevels: [],
		periods: [],
		schools: [],
		yearId: '',
		periodId: '',
		schoolScopeId: '',
		scopeGeneration: 0,
		shellReady: false,
		studentCount: 0,
		guardianCount: 0,
		staffCount: 0,
		teacherCount: 0,
		setSchoolScope() {},
		setYear() {},
		setPeriod() {},
		initFromShell() {},
		clearShellCatalog() {},
		reset() {
			this.yearId = '';
			this.periodId = '';
			this.schoolScopeId = '';
			this.scopeGeneration = 0;
		},
	},
});

stubSvelteModule('../../src/routes/onboarding/context.svelte', {
	onboardingContext: {
		draft: {},
		initialized: false,
		init() {},
		reset() {},
		persist() {},
	},
});

stubSvelteModule('$lib/import/preferences/import-preferences.svelte', {
	IMPORT_MULTI_VALUE_SEPARATORS: [';', '&'],
	importPreferences: {
		multiValueSeparator: ';',
		setMultiValueSeparator() {},
	},
});
