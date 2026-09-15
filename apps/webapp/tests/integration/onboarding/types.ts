import type { Browser, Page } from 'playwright';

export interface OnboardingCredentials {
	email: string;
	password: string;
	name: string;
	schoolName: string;
	city: string;
}

export interface OnboardingRunContext {
	page: Page;
	browser: Browser;
	base: string;
	outDir: string;
	credentials: OnboardingCredentials;
}

export interface OnboardingSceneResult {
	id: string;
	ok: true;
	detail?: string;
}

export interface OnboardingSuiteSummary {
	generatedAt: string;
	ok: boolean;
	base: string;
	email: string;
	schoolName: string;
	scenes: OnboardingSceneResult[];
}
