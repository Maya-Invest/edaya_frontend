/**
 * Cursor's sandbox sets PLAYWRIGHT_BROWSERS_PATH to a temp cache that is wiped
 * between sessions, so Chromium looks "always missing". Pin local runs to a
 * project-local directory and install Chromium there only when it is absent.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PROJECT_BROWSERS_DIR = path.resolve(import.meta.dirname, '..', '.cache', 'ms-playwright');

function isEphemeralBrowsersPath(dir: string | undefined): boolean {
	if (!dir || dir.trim() === '') {
		return true;
	}
	return dir.replace(/\\/g, '/').toLowerCase().includes('cursor-sandbox-cache');
}

export function persistentPlaywrightBrowsersPath(): string {
	return PROJECT_BROWSERS_DIR;
}

export function applyPersistentPlaywrightBrowsersPath(): string {
	if (!process.env.GITHUB_ACTIONS && isEphemeralBrowsersPath(process.env.PLAYWRIGHT_BROWSERS_PATH)) {
		mkdirSync(PROJECT_BROWSERS_DIR, { recursive: true });
		process.env.PLAYWRIGHT_BROWSERS_PATH = PROJECT_BROWSERS_DIR;
	}
	else if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
		mkdirSync(process.env.PLAYWRIGHT_BROWSERS_PATH, { recursive: true });
	}
	return process.env.PLAYWRIGHT_BROWSERS_PATH ?? PROJECT_BROWSERS_DIR;
}

function chromiumLooksInstalled(dir: string): boolean {
	if (!existsSync(dir)) {
		return false;
	}
	try {
		return readdirSync(dir).some(entry => entry.startsWith('chromium'));
	}
	catch {
		return false;
	}
}

export function ensurePlaywrightChromium(): string {
	const dir = applyPersistentPlaywrightBrowsersPath();
	if (chromiumLooksInstalled(dir)) {
		return dir;
	}

	console.log(`Playwright Chromium missing — installing into ${dir}`);
	const result = spawnSync(
		'bunx',
		['playwright', 'install', 'chromium'],
		{
			cwd: path.resolve(import.meta.dirname, '..'),
			env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: dir },
			stdio: 'inherit',
			shell: true,
		},
	);
	if (result.status !== 0) {
		throw new Error(`Failed to install Playwright Chromium into ${dir}`);
	}
	return dir;
}
