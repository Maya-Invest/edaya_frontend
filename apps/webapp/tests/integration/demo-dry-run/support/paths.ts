import path from 'node:path';

export const DEMO_DRY_RUN_OUT_DIR = path.join(
	import.meta.dirname,
	'../../../../.demo-dry-run',
);

export const DEMO_WEBAPP_BASE = process.env.WEBAPP_URL ?? 'http://localhost:5173';
