import type { AppShellData } from '$lib/api/shell-data';
import { academicContext } from '$lib/academic/context.svelte';
import { configureBrowserSchoolClient } from '$lib/api/school-client';
import { resetBootstrapSession } from '$lib/auth/bootstrap';
import { authSession } from '$lib/auth/session.svelte';
import { pageQueryStatus } from '$lib/queries/page-query-status.svelte';
import { getAppShellData } from '$lib/queries/shell.queries';

let bootstrapPromise: Promise<void> | null = null;
let bootstrapShellKey = '';

function shellBootstrapKey(): string {
	return `${authSession.sessionKind ?? ''}:${authSession.schoolId ?? ''}:${authSession.userId ?? ''}`;
}

function shellLooksEmpty(shell: AppShellData): boolean {
	if (!authSession.schoolId) {
		return false;
	}
	return shell.academicYears.length === 0 && shell.schools.length === 0;
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function bootstrapAppShell(): Promise<void> {
	const key = shellBootstrapKey();
	if (bootstrapPromise && bootstrapShellKey === key) {
		return bootstrapPromise;
	}
	bootstrapShellKey = key;
	bootstrapPromise = runBootstrapAppShell();
	return bootstrapPromise;
}

export function resetAppShellBootstrap() {
	bootstrapPromise = null;
	bootstrapShellKey = '';
	resetBootstrapSession();
	academicContext.clearShellCatalog();
	pageQueryStatus.reset();
}

export function invalidateAppShellBootstrapCache() {
	bootstrapPromise = null;
	bootstrapShellKey = '';
}

async function runBootstrapAppShell() {
	configureBrowserSchoolClient({
		getYearId: () => (academicContext.shellReady ? academicContext.yearId : undefined),
	});

	try {
		let shell = await getAppShellData();
		if (shellLooksEmpty(shell)) {
			await delay(400);
			shell = await getAppShellData();
		}
		academicContext.initFromShell(shell);
	}
	catch (error) {
		console.error('[bootstrapAppShell] failed to load shell data', error);
		academicContext.initFromShell({
			schools: [],
			academicYears: [],
			academicPeriods: [],
			gradeLevels: [],
			periodDefinitions: [],
			classes: [],
			hierarchy: [],
			studentCount: 0,
			guardianCount: 0,
			staffCount: 0,
		});
	}
}
