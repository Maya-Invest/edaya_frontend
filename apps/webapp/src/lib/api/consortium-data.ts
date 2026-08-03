import { PUBLIC_API_URL } from '$env/static/public';
import { authSession } from '$lib/auth/session.svelte';
import { parseApiResponse, resolveApiUrl } from '$lib/api/http';

export interface ConsortiumSharedRules {
	structureTemplateIds: string[];
}

export interface ConsortiumDto {
	id: string;
	name: string;
	country?: string;
	ownerSubjectId: string;
	sharedRules: ConsortiumSharedRules;
	createdAt: string;
}

export interface ConsortiumSchoolStats {
	schoolId: string;
	schoolName: string;
	studentCount: number;
	staffCount: number;
	overdueFeeCount: number;
	overdueFeeAmount: number;
	recentPaymentAmount: number;
	absencesToday: number;
	openIncidentCount: number;
	ownerSubjectId?: string;
	ownerName?: string;
	ownerEmail?: string;
	ownerStatus: 'assigned' | 'pending_invite' | 'unassigned';
	assignableStaff: Array<{
		subjectId: string;
		name: string;
		email?: string;
	}>;
}

export interface ConsortiumDashboardDto {
	consortium: {
		id: string;
		name: string;
		country?: string;
		sharedRules: ConsortiumSharedRules;
	};
	schoolCount: number;
	totals: {
		studentCount: number;
		staffCount: number;
		overdueFeeCount: number;
		overdueFeeAmount: number;
		recentPaymentAmount: number;
		absencesToday: number;
		openIncidentCount: number;
	};
	schools: ConsortiumSchoolStats[];
}

export interface ConsortiumSchoolDto {
	id: string;
	name: string;
	city?: string;
	country?: string;
	timeZone: string;
	consortiumId?: string;
}

function applyHeaders(headers: Headers, body?: unknown) {
	headers.set('Accept', 'application/json');
	if (body !== undefined) {
		headers.set('Content-Type', 'application/json');
	}
	if (authSession.sessionKind) {
		headers.set('X-Actor-Kind', authSession.sessionKind);
		if (authSession.userId) {
			headers.set('X-Actor-Id', authSession.userId);
		}
	}
	if (authSession.schoolId) {
		headers.set('X-School-Id', authSession.schoolId);
	}
}

async function consortiumRequest<T>(
	method: string,
	path: string,
	body?: unknown,
): Promise<T> {
	const headers = new Headers();
	applyHeaders(headers, body);
	const response = await fetch(resolveApiUrl(PUBLIC_API_URL || '', path), {
		method,
		headers,
		credentials: 'include',
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	return parseApiResponse<T>(path, response);
}

export async function createConsortiumApi(input: {
	name: string;
	country?: string;
	sharedRules?: ConsortiumSharedRules;
}): Promise<ConsortiumDto> {
	return consortiumRequest<ConsortiumDto>('POST', '/core/consortium/create', input);
}

export async function fetchMyConsortium(): Promise<ConsortiumDto | null> {
	return consortiumRequest<ConsortiumDto | null>('GET', '/core/consortium/mine');
}

export async function fetchConsortiumDashboard(consortiumId: string): Promise<ConsortiumDashboardDto> {
	return consortiumRequest<ConsortiumDashboardDto>(
		'GET',
		`/core/consortium/${encodeURIComponent(consortiumId)}/dashboard`,
	);
}

export async function fetchConsortiumSchools(consortiumId: string): Promise<ConsortiumSchoolDto[]> {
	return consortiumRequest<ConsortiumSchoolDto[]>(
		'GET',
		`/core/consortium/${encodeURIComponent(consortiumId)}/schools`,
	);
}

export async function updateConsortiumSharedRulesApi(
	consortiumId: string,
	sharedRules: ConsortiumSharedRules,
): Promise<ConsortiumDto> {
	return consortiumRequest<ConsortiumDto>(
		'POST',
		`/core/consortium/${encodeURIComponent(consortiumId)}/shared-rules`,
		{ sharedRules },
	);
}

export async function applyConsortiumSharedRulesApi(
	consortiumId: string,
	input: {
		schoolId: string;
		levels: Array<{ gradeLevelId: string; classCount: number; capacity: number }>;
	},
): Promise<unknown> {
	return consortiumRequest(
		'POST',
		`/core/consortium/${encodeURIComponent(consortiumId)}/apply-shared-rules`,
		input,
	);
}

export async function registerSchoolApi(input: {
	name: string;
	timeZone: string;
	city?: string;
	country?: string;
	consortiumId?: string;
	assignAsSchoolOwner?: boolean;
	ownerInviteEmail?: string;
}): Promise<{ id: string }> {
	return consortiumRequest<{ id: string }>('POST', '/core/onboarding/register-school', input);
}

export async function assignConsortiumSchoolOwnerApi(
	consortiumId: string,
	schoolId: string,
	input: { subjectId?: string; email?: string },
): Promise<{
	schoolId: string;
	ownerSubjectId?: string;
	pendingOwnerStaffId?: string;
	ownerStatus: 'assigned' | 'pending_invite';
}> {
	return consortiumRequest(
		'POST',
		`/core/consortium/${encodeURIComponent(consortiumId)}/schools/${encodeURIComponent(schoolId)}/assign-owner`,
		input,
	);
}
