/**
 * API provisioning for integration tests.
 *
 * Identity (`AUTH_URL`, default http://localhost:9900):
 *   1. POST /auth/sign-up/email — user
 *   2. POST /dev/seed/mark-email-verified — skip email OTP in local/CI
 *   3. POST /auth/edaya/access-token — school Bearer JWT
 *
 * School API (`API_URL`, default http://localhost:9999):
 *   4. POST /core/onboarding/register-school — school (only data entity)
 *   5. POST /core/onboarding/complete-wizard — wizard flag (no data)
 *
 * Identity cookies never go to `/core`. School requests use Bearer only.
 */
import { isIdentityPath, resolveApiUrl, resolveAuthUrl } from './integration-hosts';

const SEED_AUTH_PROVISION_HEADER = 'x-edaya-seed-provision';

export interface SecondaryAccountCredentials {
	email: string;
	password: string;
	entityId: string;
}

export interface SecondaryAccounts {
	teacher?: SecondaryAccountCredentials;
	educator?: SecondaryAccountCredentials;
}

export interface ProvisionedTenant {
	email: string;
	password: string;
	name: string;
	subjectId: string;
	schoolId: string;
	schoolName: string;
	apiUrl: string;
	authUrl: string;
	wizardCompleted: boolean;
	createdAt: string;
	secondaryAccounts?: SecondaryAccounts;
}

export interface ProvisionTenantOptions {
	apiUrl?: string;
	authUrl?: string;
	appOrigin?: string;
	schoolName?: string;
}

interface AuthUserResponse {
	user?: {
		id?: string;
		email?: string;
	};
}

interface SchoolResponse {
	id?: string;
	name?: string;
}

interface OnboardingAccountStatusResponse {
	wizardCompleted?: boolean;
}

function parseSetCookie(setCookie: string): { name: string; value: string } | null {
	const [pair] = setCookie.split(';');
	if (!pair) {
		return null;
	}

	const separatorIndex = pair.indexOf('=');
	if (separatorIndex <= 0) {
		return null;
	}

	return {
		name: pair.slice(0, separatorIndex).trim(),
		value: pair.slice(separatorIndex + 1).trim(),
	};
}

class ProvisionHttpClient {
	private readonly apiUrl: string;
	private readonly authUrl: string;
	private readonly appOrigin?: string;
	private readonly cookies = new Map<string, string>();
	private accessToken?: { value: string; expiresAt: number };
	private exchange?: Promise<string | undefined>;

	constructor(apiUrl: string, appOrigin?: string, authUrl?: string) {
		this.apiUrl = resolveApiUrl(apiUrl);
		this.authUrl = resolveAuthUrl(authUrl);
		this.appOrigin = appOrigin?.replace(/\/+$/, '');
	}

	private cookieHeader(): string | undefined {
		if (this.cookies.size === 0) {
			return undefined;
		}

		return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
	}

	private absorbCookies(response: Response): void {
		const headers = response.headers as Headers & { getSetCookie?: () => string[] };
		const setCookies = typeof headers.getSetCookie === 'function'
			? headers.getSetCookie()
			: (() => {
					const single = response.headers.get('set-cookie');
					return single ? [single] : [];
				})();

		for (const setCookie of setCookies) {
			const parsed = parseSetCookie(setCookie);
			if (parsed) {
				this.cookies.set(parsed.name, parsed.value);
			}
		}
	}

	private isApiRequest(url: string): boolean {
		try {
			return new URL(url).origin === new URL(this.apiUrl).origin;
		}
		catch {
			return false;
		}
	}

	private async getAccessToken(): Promise<string | undefined> {
		if (this.accessToken && this.accessToken.expiresAt > Date.now() + 30_000) {
			return this.accessToken.value;
		}
		if (!this.cookieHeader()) {
			return undefined;
		}

		this.exchange ??= (async () => {
			const renewal = this.cookieHeader();
			const response = await this.request('/auth/edaya/access-token', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ resource: new URL(this.apiUrl).origin }),
			});
			if (response.status === 401) {
				return undefined;
			}
			if (!response.ok) {
				throw new Error(`Provision access-token exchange failed: HTTP ${response.status}`);
			}
			const token = await response.json() as { accessToken: string; expiresAt: string };
			if (
				typeof token.accessToken !== 'string'
				|| token.accessToken.length === 0
				|| !Number.isFinite(Date.parse(token.expiresAt))
			) {
				throw new Error('Invalid provision access-token response');
			}
			if (renewal !== this.cookieHeader()) {
				return undefined;
			}
			this.accessToken = { value: token.accessToken, expiresAt: Date.parse(token.expiresAt) };
			return token.accessToken;
		})().finally(() => {
			this.exchange = undefined;
		});
		return this.exchange;
	}

	async request(path: string, init: RequestInit = {}): Promise<Response> {
		const normalizedPath = path.startsWith('/') ? path : `/${path}`;
		const identityPath = isIdentityPath(normalizedPath);
		const url = path.startsWith('http')
			? path
			: `${identityPath ? this.authUrl : this.apiUrl}${normalizedPath}`;
		const headers = new Headers(init.headers);
		const cookieHeader = this.cookieHeader();
		const hasBearerAuth = headers.get('authorization')?.toLowerCase().startsWith('bearer ') ?? false;

		if (identityPath) {
			if (cookieHeader && !headers.has('cookie') && !hasBearerAuth) {
				headers.set('cookie', cookieHeader);
			}
			if (!headers.has('origin')) {
				headers.set('origin', this.appOrigin ?? new URL(this.authUrl).origin);
			}
		}
		else if (this.isApiRequest(url)) {
			headers.delete('cookie');
			if (!headers.has('authorization')) {
				const accessToken = await this.getAccessToken();
				if (accessToken) {
					headers.set('authorization', `Bearer ${accessToken}`);
				}
			}
			if (!headers.has('origin')) {
				headers.set('origin', this.appOrigin ?? new URL(this.apiUrl).origin);
			}
		}

		const response = await fetch(url, { ...init, headers });
		if (identityPath) {
			this.absorbCookies(response);
		}
		return response;
	}

	async jsonRequest<T>(path: string, init: RequestInit = {}): Promise<{ response: Response; body: T | null }> {
		const response = await this.request(path, init);
		const text = await response.text();
		if (!text.trim()) {
			return { response, body: null };
		}

		return {
			response,
			body: JSON.parse(text) as T,
		};
	}
}

function generateEmail(prefix = 'e2e'): string {
	const suffix = crypto.randomUUID().slice(0, 8);
	return `${prefix}-${Date.now()}-${suffix}@integration.edaya.test`;
}

function generatePassword(): string {
	const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
	return `E2e!${suffix}`;
}

export function createSecondaryEmail(role: 'teacher' | 'educator'): string {
	return generateEmail(`e2e-${role}`);
}

export function createSecondaryPassword(): string {
	return generatePassword();
}

export async function signUpAccount(
	apiUrl: string,
	appOrigin: string,
	email: string,
	password: string,
	name: string,
): Promise<{ client: ProvisionHttpClient; subjectId: string }> {
	const client = new ProvisionHttpClient(apiUrl, appOrigin);
	const subjectId = await signUp(client, email, password, name);
	return { client, subjectId };
}

export async function signInAccount(
	apiUrl: string,
	appOrigin: string,
	email: string,
	password: string,
): Promise<ProvisionHttpClient> {
	const client = new ProvisionHttpClient(apiUrl, appOrigin);
	const { response, body } = await client.jsonRequest('/auth/sign-in/email', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email, password }),
	});
	if (!response.ok) {
		const detail = body ? JSON.stringify(body) : await response.text();
		throw new Error(`sign-in failed: ${response.status} ${detail}`);
	}
	return client;
}

export interface AcceptInvitationResult {
	ok: boolean;
	detail?: string;
}

export interface AcceptInvitationTokenOptions {
	refreshToken?: () => Promise<string | null>;
}

async function acceptInvitationTokenDetailed(
	client: ProvisionHttpClient,
	token: string,
): Promise<AcceptInvitationResult> {
	const { response, body } = await client.jsonRequest<Record<string, unknown>>(
		'/public/invitations/' + encodeURIComponent(token) + '/accept',
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({}),
		},
	);
	if (!response.ok) {
		const detail = body ? JSON.stringify(body) : await response.text();
		return { ok: false, detail: `accept ${response.status}: ${detail}` };
	}
	await client.jsonRequest<OnboardingAccountStatusResponse>(
		'/core/onboarding/complete-wizard',
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({}),
		},
	).catch(() => null);
	return { ok: true };
}

export async function acceptInvitationToken(
	client: ProvisionHttpClient,
	token: string,
): Promise<boolean> {
	return (await acceptInvitationTokenDetailed(client, token)).ok;
}

export async function acceptInvitationTokenWithRetry(
	apiUrl: string,
	appOrigin: string,
	email: string,
	password: string,
	name: string,
	token: string,
	options: AcceptInvitationTokenOptions = {},
): Promise<AcceptInvitationResult> {
	try {
		await signUpAccount(apiUrl, appOrigin, email, password, name);
	}
	catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (!/already exists|USER_ALREADY_EXISTS/i.test(message)) {
			return { ok: false, detail: `sign-up: ${message}` };
		}
	}

	let client: ProvisionHttpClient;
	try {
		client = await signInAccount(apiUrl, appOrigin, email, password);
	}
	catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { ok: false, detail: `sign-in: ${message}` };
	}

	let currentToken = token;
	for (let attempt = 0; attempt < 2; attempt++) {
		const result = await acceptInvitationTokenDetailed(client, currentToken);
		if (result.ok) {
			return result;
		}

		if (attempt === 0 && options.refreshToken) {
			const freshToken = await options.refreshToken();
			if (freshToken && freshToken !== currentToken) {
				currentToken = freshToken;
				continue;
			}
		}

		return result;
	}

	return { ok: false, detail: 'accept failed after token refresh' };
}

export async function ensureSecondaryAuthAccount(
	apiUrl: string,
	appOrigin: string,
	email: string,
	password: string,
	name: string,
): Promise<{ client: ProvisionHttpClient; subjectId: string } | AcceptInvitationResult> {
	try {
		return await signUpAccount(apiUrl, appOrigin, email, password, name);
	}
	catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (!/already exists|USER_ALREADY_EXISTS/i.test(message)) {
			return { ok: false, detail: `sign-up: ${message}` };
		}
	}

	try {
		const client = await signInAccount(apiUrl, appOrigin, email, password);
		const { response, body } = await client.jsonRequest<{ user?: { id?: string } }>('/auth/get-session');
		const subjectId = response.ok ? body?.user?.id : undefined;
		if (!subjectId) {
			return { ok: false, detail: 'sign-in succeeded but session has no user.id' };
		}
		return { client, subjectId };
	}
	catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { ok: false, detail: `sign-in: ${message}` };
	}
}

async function completeWizardForClient(client: ProvisionHttpClient): Promise<void> {
	await client.jsonRequest<OnboardingAccountStatusResponse>(
		'/core/onboarding/complete-wizard',
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({}),
		},
	).catch(() => null);
}

export async function activateTeacherSecondaryAccount(
	apiUrl: string,
	appOrigin: string,
	email: string,
	password: string,
	name: string,
	token: string | null,
	teacherId: string,
	linkViaOwner: (subjectId: string) => Promise<boolean>,
): Promise<AcceptInvitationResult> {
	if (!token) {
		return { ok: false, detail: 'no invitation token' };
	}

	const auth = await ensureSecondaryAuthAccount(apiUrl, appOrigin, email, password, name);
	if ('ok' in auth && auth.ok === false) {
		return auth;
	}
	const { client, subjectId } = auth as { client: ProvisionHttpClient; subjectId: string };

	const acceptResult = await acceptInvitationTokenDetailed(client, token);
	if (acceptResult.ok) {
		return acceptResult;
	}

	// Keep an owner link fallback if public accept is forbidden for any other reason.
	if (!/403|forbidden/i.test(acceptResult.detail ?? '')) {
		return acceptResult;
	}

	const linked = await linkViaOwner(subjectId);
	if (!linked) {
		return {
			ok: false,
			detail: `link-actor-subject fallback failed after ${acceptResult.detail}`,
		};
	}

	await completeWizardForClient(client);
	return { ok: true, detail: `linked via owner (${subjectId} -> ${teacherId})` };
}

async function markEmailVerified(client: ProvisionHttpClient, email: string, subjectId?: string): Promise<void> {
	const response = await client.request('/dev/seed/mark-email-verified', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			[SEED_AUTH_PROVISION_HEADER]: '1',
		},
		body: JSON.stringify(subjectId ? { subjectId, email } : { email }),
	});

	if (response.ok || response.status === 404) {
		return;
	}

	const message = await response.text();
	throw new Error(`mark-email-verified failed: ${response.status} ${message}`);
}

async function signUp(
	client: ProvisionHttpClient,
	email: string,
	password: string,
	name: string,
): Promise<string> {
	const { response, body } = await client.jsonRequest<AuthUserResponse>('/auth/sign-up/email', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			[SEED_AUTH_PROVISION_HEADER]: '1',
		},
		body: JSON.stringify({ email, password, name }),
	});

	if (!response.ok) {
		const detail = body ? JSON.stringify(body) : await response.text();
		throw new Error(`sign-up failed: ${response.status} ${detail}`);
	}

	const subjectId = body?.user?.id;
	if (!subjectId) {
		throw new Error('sign-up succeeded but no user.id in response');
	}

	await markEmailVerified(client, email, subjectId);
	return subjectId;
}

async function registerSchool(
	client: ProvisionHttpClient,
	schoolName: string,
): Promise<string> {
	const { response, body } = await client.jsonRequest<SchoolResponse>('/core/onboarding/register-school', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			name: schoolName,
			timeZone: 'Europe/Paris',
			city: 'Abidjan',
			country: 'Côte d\'Ivoire',
			type: 'k12',
		}),
	});

	if (!response.ok) {
		const detail = body ? JSON.stringify(body) : await response.text();
		throw new Error(`register-school failed: ${response.status} ${detail}`);
	}

	const schoolId = body?.id;
	if (!schoolId) {
		throw new Error('register-school succeeded but no school id in response');
	}

	return schoolId;
}

async function completeWizard(client: ProvisionHttpClient): Promise<boolean> {
	const { response, body } = await client.jsonRequest<OnboardingAccountStatusResponse>(
		'/core/onboarding/complete-wizard',
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({}),
		},
	);

	if (!response.ok) {
		const detail = body ? JSON.stringify(body) : await response.text();
		throw new Error(`complete-wizard failed: ${response.status} ${detail}`);
	}

	return body?.wizardCompleted !== false;
}

export async function provisionTenant(options: ProvisionTenantOptions = {}): Promise<ProvisionedTenant> {
	const apiUrl = resolveApiUrl(options.apiUrl);
	const authUrl = resolveAuthUrl(options.authUrl);
	const appOrigin = options.appOrigin ?? process.env.WEBAPP_URL ?? 'http://localhost:5173';
	const email = generateEmail();
	const password = generatePassword();
	const name = 'E2E Owner';
	const schoolName = options.schoolName ?? `E2E School ${Date.now()}`;
	const client = new ProvisionHttpClient(apiUrl, appOrigin, authUrl);

	const subjectId = await signUp(client, email, password, name);
	const schoolId = await registerSchool(client, schoolName);
	const wizardCompleted = await completeWizard(client);

	return {
		email,
		password,
		name,
		subjectId,
		schoolId,
		schoolName,
		apiUrl,
		authUrl,
		wizardCompleted,
		createdAt: new Date().toISOString(),
	};
}
