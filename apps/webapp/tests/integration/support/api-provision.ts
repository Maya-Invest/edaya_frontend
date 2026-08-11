/**
 * API provisioning for integration tests.
 *
 * API boundary (only these calls):
 *   1. POST /auth/sign-up/email — user
 *   2. POST /core/onboarding/register-school — school (only data entity)
 *   3. POST /core/onboarding/complete-wizard — wizard flag (no data)
 *
 * Prerequisites: API running at API_URL (default http://localhost:9999).
 */
const SEED_AUTH_PROVISION_HEADER = 'x-edaya-seed-provision';

export interface ProvisionedTenant {
	email: string;
	password: string;
	name: string;
	subjectId: string;
	schoolId: string;
	schoolName: string;
	apiUrl: string;
	wizardCompleted: boolean;
	createdAt: string;
}

export interface ProvisionTenantOptions {
	apiUrl?: string;
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

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, '');
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
	private readonly baseUrl: string;
	private readonly appOrigin?: string;
	private readonly cookies = new Map<string, string>();

	constructor(baseUrl: string, appOrigin?: string) {
		this.baseUrl = normalizeBaseUrl(baseUrl);
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

	async request(path: string, init: RequestInit = {}): Promise<Response> {
		const url = path.startsWith('http')
			? path
			: `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
		const headers = new Headers(init.headers);
		const cookieHeader = this.cookieHeader();

		if (cookieHeader && !headers.has('cookie')) {
			headers.set('cookie', cookieHeader);
		}
		if (this.appOrigin && !headers.has('origin')) {
			headers.set('origin', this.appOrigin);
		}

		const response = await fetch(url, { ...init, headers });
		this.absorbCookies(response);
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

function generateEmail(): string {
	const suffix = crypto.randomUUID().slice(0, 8);
	return `e2e-${Date.now()}-${suffix}@integration.edaya.test`;
}

function generatePassword(): string {
	const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
	return `E2e!${suffix}`;
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
	const apiUrl = normalizeBaseUrl(options.apiUrl ?? process.env.API_URL ?? 'http://localhost:9999');
	const appOrigin = options.appOrigin ?? process.env.WEBAPP_URL ?? 'http://localhost:5173';
	const email = generateEmail();
	const password = generatePassword();
	const name = 'E2E Owner';
	const schoolName = options.schoolName ?? `E2E School ${Date.now()}`;
	const client = new ProvisionHttpClient(apiUrl, appOrigin);

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
		wizardCompleted,
		createdAt: new Date().toISOString(),
	};
}
