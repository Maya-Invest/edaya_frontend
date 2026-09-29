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
	ok: boolean;
	status: 'passed' | 'failed' | 'blocked';
	feature: string;
	durationMs: number;
	detail?: string;
}

export interface OnboardingSuiteSummary {
	generatedAt: string;
	ok: boolean;
	base: string;
	email: string;
	schoolName: string;
	scenes: OnboardingSceneResult[];
	catalog?: {
		automated: number;
		na: number;
		unique: number;
		excluded: number;
		manual: number;
	};
}
