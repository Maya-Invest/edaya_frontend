import { describe, expect, it } from 'bun:test';
import {
	readListCardColumns,
	readListView,
	writeListCardColumns,
	writeListView,
} from '$lib/list/list-view-url';
import { readModal, writeModal } from '$lib/modal/modal-url';
import {
	readExpandedAcademicYear,
	writeExpandedAcademicYear,
} from '../../../src/routes/(app)/configuration/academic/lib/academic-expanded-year';
import {
	readExpandedStudentSubject,
	writeExpandedStudentSubject,
} from '../../../src/routes/(app)/school/students/[[id]]/(tabs)/grades/student-subject-url';
import {
	canonicalInvitationAuthUrlState,
	readInvitationAuthUrlState,
	writeInvitationAuthUrlState,
} from '../../../src/routes/invite/[token]/invitation-auth-url';
import {
	canonicalLoginUrlState,
	readLoginUrlState,
	writeLoginUrlState,
} from '../../../src/routes/login/login-url-state';

function url(path: string): URL {
	return new URL(path, 'https://school.test');
}

describe('addressable non-modal view URL state', () => {
	it('round-trips list view while preserving filters and modal state', () => {
		const href = writeListView(url('/school/students?q=ada&modal=create'), 'cards');
		expect(href).toBe('/school/students?q=ada&modal=create&view=cards');
		expect(readListView(url(href))).toBe('cards');
		expect(readListView(url('/school/students?view=unknown'))).toBe('table');
	});

	it('round-trips card density while preserving list and modal state', () => {
		const href = writeListCardColumns(
			url('/school/students?q=ada&modal=create&view=cards'),
			4,
		);
		expect(href).toBe(
			'/school/students?q=ada&modal=create&view=cards&cardColumns=4',
		);
		expect(readListCardColumns(url(href), 2)).toBe(4);
	});

	it('uses the stored card density fallback only when the URL value is absent', () => {
		expect(readListCardColumns(url('/school/activities'), 2)).toBe(2);
		expect(readListCardColumns(url('/school/activities?cardColumns=3'), 2)).toBe(3);
		expect(readListCardColumns(url('/school/activities?cardColumns=99'), 4)).toBe(3);
	});

	it('routes login panel, method, and stage without credentials', () => {
		const href = writeLoginUrlState(
			url('/login?email=ada%40school.test&password=secret&otp=123456'),
			{ panel: 'signin', method: 'email-otp', stage: 'code' },
		);
		expect(href).toBe('/login?panel=signin&method=email-otp&stage=code');
		expect(readLoginUrlState(url(href), { showSignup: true })).toEqual({
			panel: 'signin',
			method: 'email-otp',
			stage: 'code',
		});
		expect(
			readLoginUrlState(
				url('/login?panel=signup&method=password&stage=verification'),
				{ showSignup: false },
			),
		).toEqual({ panel: 'signin', method: 'password', stage: 'form' });
	});

	it('resets login stages that lost their local email identity', () => {
		const codeState = { panel: 'signin', method: 'email-otp', stage: 'code' } as const;
		const verificationState = {
			panel: 'signup',
			method: 'password',
			stage: 'verification',
		} as const;

		expect(canonicalLoginUrlState(codeState, { hasEmailIdentity: false })).toEqual({
			...codeState,
			stage: 'form',
		});
		expect(canonicalLoginUrlState(verificationState, { hasEmailIdentity: false })).toEqual({
			...verificationState,
			stage: 'form',
		});
		expect(canonicalLoginUrlState(codeState, { hasEmailIdentity: true })).toBe(codeState);
	});

	it('routes invitation auth mode and safe stage only', () => {
		const href = writeInvitationAuthUrlState(
			url('/invite/token?email=ada%40school.test&password=secret'),
			{ mode: 'signUp', stage: 'verification' },
		);
		expect(href).toBe('/invite/token?auth=signUp&stage=verification');
		expect(readInvitationAuthUrlState(url(href))).toEqual({
			mode: 'signUp',
			stage: 'verification',
		});
		expect(readInvitationAuthUrlState(url('/invite/token?auth=signIn&stage=verification'))).toEqual({
			mode: 'signIn',
			stage: 'form',
		});
	});

	it('resets invitation verification when identity cannot be restored', () => {
		const verificationState = { mode: 'signUp', stage: 'verification' } as const;

		expect(canonicalInvitationAuthUrlState(
			verificationState,
			{ hasEmailIdentity: false },
		)).toEqual({ mode: 'signUp', stage: 'form' });
		expect(canonicalInvitationAuthUrlState(
			verificationState,
			{ hasEmailIdentity: true },
		)).toBe(verificationState);
	});

	it('canonicalizes expanded academic years and supports an explicit collapsed state', () => {
		const allowed = ['year-2025', 'year-2026'];
		expect(readExpandedAcademicYear(url('/configuration/academic'), allowed, 'year-2026'))
			.toBe('year-2026');
		expect(
			readExpandedAcademicYear(
				url('/configuration/academic?year=missing'),
				allowed,
				'year-2026',
			),
		).toBe('year-2026');
		const href = writeExpandedAcademicYear(
			url('/configuration/academic?q=2026'),
			null,
		);
		expect(href).toBe('/configuration/academic?q=2026&year=none');
		expect(readExpandedAcademicYear(url(href), allowed, 'year-2026')).toBeNull();
	});

	it('routes one expanded student subject and rejects stale subjects', () => {
		const href = writeExpandedStudentSubject(
			url('/school/students/stu-1/grades?modal=add-grade'),
			'Mathematics',
		);
		expect(href).toBe(
			'/school/students/stu-1/grades?modal=add-grade&subject=Mathematics',
		);
		expect(readExpandedStudentSubject(url(href), ['Mathematics', 'French']))
			.toBe('Mathematics');
		expect(readExpandedStudentSubject(url(href), ['French'])).toBeNull();
	});

	it('allow-lists the student health edit modal URL', () => {
		const href = writeModal(url('/school/students/stu-1'), 'edit-health');
		expect(readModal(url(href), ['edit-profile', 'edit-health'])).toBe('edit-health');
	});
});
