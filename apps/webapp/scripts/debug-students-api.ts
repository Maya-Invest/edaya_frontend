#!/usr/bin/env bun
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { provisionTenant } from '../tests/integration/support/api-provision';

const FIXTURE = path.join(import.meta.dirname, '..', '.integration-run', 'fixture.json');

async function signIn(apiUrl: string, origin: string, email: string, password: string): Promise<Map<string, string>> {
	const cookies = new Map<string, string>();
	const res = await fetch(`${apiUrl}/auth/sign-in/email`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin },
		body: JSON.stringify({ email, password }),
	});
	for (const c of res.headers.getSetCookie?.() ?? []) {
		const [pair] = c.split(';');
		const i = pair.indexOf('=');
		if (i > 0) cookies.set(pair.slice(0, i), pair.slice(i + 1));
	}
	console.log('sign-in:', res.status, await res.text().then(t => t.slice(0, 120)));
	return cookies;
}

function cookieHeader(cookies: Map<string, string>) {
	return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function post(apiUrl: string, origin: string, cookies: Map<string, string>, path: string, body: unknown, extra: Record<string, string> = {}, label = path) {
	const res = await fetch(`${apiUrl}${path}`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			origin,
			cookie: cookieHeader(cookies),
			...extra,
		},
		body: JSON.stringify(body),
	});
	const text = await res.text();
	console.log(`\n${label} -> ${res.status}`);
	console.log(text.slice(0, 400));
	return res.status;
}

async function get(apiUrl: string, origin: string, cookies: Map<string, string>, path: string, extra: Record<string, string> = {}) {
	const res = await fetch(`${apiUrl}${path}`, {
		method: 'GET',
		headers: { origin, cookie: cookieHeader(cookies), ...extra },
	});
	const text = await res.text();
	console.log(`\nGET ${path} -> ${res.status}`);
	console.log(text.slice(0, 600));
	return { status: res.status, body: text };
}

async function main() {
	let email: string;
	let password: string;
	let schoolId: string;
	const apiUrl = 'http://localhost:9999';
	const origin = 'http://localhost:5173';

	try {
		const f = JSON.parse(await readFile(FIXTURE, 'utf8')) as { email: string; password: string; schoolId: string };
		email = f.email;
		password = f.password;
		schoolId = f.schoolId;
		console.log('Using fixture', email);
	}
	catch {
		const t = await provisionTenant();
		email = t.email;
		password = t.password;
		schoolId = t.schoolId;
		console.log('Provisioned', email);
	}

	const cookies = await signIn(apiUrl, origin, email, password);

	const grants = await get(apiUrl, origin, cookies, '/core/authorization/effective-grants');
	let actorId = '';
	let actorSchoolId = schoolId;
	try {
		const parsed = JSON.parse(grants.body) as { actorId?: string; schoolId?: string; effectiveGrants?: { isElevated?: boolean; permissions?: string[] } };
		actorId = parsed.actorId ?? '';
		actorSchoolId = parsed.schoolId ?? schoolId;
		console.log('actorId:', actorId, 'elevated:', parsed.effectiveGrants?.isElevated, 'perms:', parsed.effectiveGrants?.permissions?.length);
	}
	catch {}

	await post(apiUrl, origin, cookies, '/core/entities/academic-years/list', {}, {
		'x-school-id': actorSchoolId,
		'x-actor-kind': 'staff',
		...(actorId ? { 'x-actor-id': actorId } : {}),
	});

	let yearId = '';
	try {
		const yearsRes = await fetch(`${apiUrl}/core/entities/academic-years/list`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				origin,
				cookie: cookieHeader(cookies),
				'x-school-id': actorSchoolId,
				'x-actor-kind': 'staff',
				...(actorId ? { 'x-actor-id': actorId } : {}),
			},
			body: JSON.stringify({}),
		});
		const years = await yearsRes.json() as Array<{ id: string; label: string; status: string }>;
		yearId = years[0]?.id ?? '';
		console.log('\nYears:', years.map(y => `${y.label} (${y.status})`).join(', '));
	}
	catch {}

	await post(apiUrl, origin, cookies, '/core/entities/students/list', {}, {
		'x-school-id': actorSchoolId,
	}, 'students/list auto');

	await post(apiUrl, origin, cookies, '/core/entities/students/list', {}, {
		'x-school-id': actorSchoolId,
		'x-actor-kind': 'staff',
		...(actorId ? { 'x-actor-id': actorId } : {}),
		...(yearId ? { 'x-academic-year-id': yearId } : {}),
	}, 'students/list with headers');

	const session = await fetch(`${apiUrl}/auth/get-session`, {
		headers: { cookie: cookieHeader(cookies), origin },
	});
	console.log('\nget-session:', session.status, (await session.text()).slice(0, 300));
}

main();
