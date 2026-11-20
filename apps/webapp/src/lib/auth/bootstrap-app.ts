import { academicContext } from '$lib/academic/context.svelte';
import { configureBrowserSchoolClient } from '$lib/api/school-client';
import { resetBootstrapSession } from '$lib/auth/bootstrap';
import { authSession } from '$lib/auth/session.svelte';
import { pageQueryStatus } from '$lib/queries/page-query-status.svelte';
import { getAppShellData } from '$lib/queries/shell.queries';
import { ApiError } from '@maya-invest/edaya-api-client';

let bootstrapPromise: Promise<void> | null = null;
let bootstrapShellKey = '';
let bootstrapGeneration = 0;

function shellBootstrapKey(): string {
	return `${authSession.sessionKind ?? ''}:${authSession.schoolId ?? ''}:${authSession.userId ?? ''}`;
}

function isTransientShellFailure(error: unknown): boolean {
	if (typeof navigator !== 'undefined' && navigator.onLine === false)
		return false;
	return error instanceof TypeError || (error instanceof ApiError && [502, 503, 504].includes(error.status));
}

export function bootstrapAppShell(): Promise<void> {
	const key = shellBootstrapKey();
	if (bootstrapPromise && bootstrapShellKey === key) {
		return bootstrapPromise;
	}
	bootstrapShellKey = key;
	bootstrapPromise = runBootstrapAppShell(key, ++bootstrapGeneration);
	return bootstrapPromise;
}

export function resetAppShellBootstrap() {
	bootstrapGeneration += 1;
	bootstrapPromise = null;
	bootstrapShellKey = '';
	resetBootstrapSession();
	academicContext.clearShellCatalog();
	pageQueryStatus.reset();
}

export function invalidateAppShellBootstrapCache() {
	bootstrapGeneration += 1;
	bootstrapPromise = null;
	bootstrapShellKey = '';
}

async function runBootstrapAppShell(key: string, generation: number) {
	const isCurrent = () => generation === bootstrapGeneration && key === shellBootstrapKey();
	configureBrowserSchoolClient({
		getYearId: () => (academicContext.shellReady ? academicContext.yearId : undefined),
	});

	try {
		const shell = await getAppShellData().catch(async (error: unknown) => {
			if (!isCurrent() || !isTransientShellFailure(error))
				throw error;
			await new Promise(resolve => setTimeout(resolve, 400));
			if (!isCurrent())
				throw error;
			return getAppShellData();
		});
		if (isCurrent())
			academicContext.initFromShell(shell);
	}
	catch (error) {
		if (!isCurrent())
			return;
		bootstrapPromise = null;
		academicContext.clearShellCatalog();
		throw error;
	}
}
