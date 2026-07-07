import path from 'node:path';

export const DEMO_DRY_RUN_OUT_DIR = path.join(
	import.meta.dirname,
	'../../../../.demo-dry-run',
);

export const DEMO_WEBAPP_BASE = process.env.WEBAPP_URL ?? 'http://localhost:5173';

/** `staging` (default) uses demo picker; `production` uses email/password login. */
export function integrationUsesDemoLogin(): boolean {
	return process.env.INTEGRATION_TARGET !== 'production';
}

export function webappReadinessPath(): string {
	return process.env.WEBAPP_READINESS_PATH
		?? (integrationUsesDemoLogin() ? '/login/demo' : '/login');
}
