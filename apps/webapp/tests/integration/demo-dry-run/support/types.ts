import type { Page } from 'playwright';
import type { PageErrorTracker } from './page-errors';
import type { DemoReporter } from './reporter';

export type StepStatus = 'pass' | 'fail' | 'skip';

export interface StepResult {
	scene: string;
	step: string;
	status: StepStatus;
	detail?: string;
}

export interface DemoSummary {
	passed: number;
	failed: number;
	skipped: number;
	results: StepResult[];
	consoleErrors: string[];
}

export interface VisitOptions {
	expectText?: RegExp | string;
	selector?: string;
	selectorTimeoutMs?: number;
	pathPrefix?: string;
	retry?: boolean;
	skipOnFail?: string;
}

export interface SignInOptions {
	namePattern?: RegExp;
	email?: string;
	password?: string;
}

export interface DemoContext {
	base: string;
	page: Page;
	reporter: DemoReporter;
	pageErrors: PageErrorTracker;
	outDir: string;
	shot: (name: string) => Promise<void>;
	/** Captured during D5 timetable scene for DD drawer tabs. */
	timetableSessionId?: string | null;
}

export interface EnsureDailyAttendanceOptions {
	homeroomStaffName?: RegExp;
	force?: boolean;
}
