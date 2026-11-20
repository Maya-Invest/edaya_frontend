/** Describe missing setup prerequisites without attributing unrelated failures to students. */
import type { BlockerReport } from '../../../scripts/integration-report';

export const STUDENT_SETUP_BLOCKER = {
	step: 'student',
	module: 'Setup',
	endpoint: 'http://localhost:5173/school/students',
	action: 'Create student via UI (web tenant setup)',
	detail:
		'Required student setup did not complete. Inspect the current student setup failure before running dependent scenarios.',
} as const;

export function isStudentBlockedScenario(endpoint: string, action: string): boolean {
	if (endpoint.includes('/school/students')) {
		return true;
	}
	if (/import élèves|assigner frais à élève|générer bulletin élève/i.test(action)) {
		return true;
	}
	if (endpoint.includes('/classes/') && endpoint.includes('/students')) {
		return true;
	}
	if (endpoint.includes('/school/activities/') && endpoint.includes('/students')) {
		return true;
	}
	return false;
}

export function studentSetupBlockerReport(): BlockerReport {
	return {
		module: STUDENT_SETUP_BLOCKER.module,
		endpoint: STUDENT_SETUP_BLOCKER.endpoint,
		action: STUDENT_SETUP_BLOCKER.action,
		detail: STUDENT_SETUP_BLOCKER.detail,
		status: 'blocked',
		source: 'setup',
	};
}
