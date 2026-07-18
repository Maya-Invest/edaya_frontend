import { academicContext } from '$lib/academic/context.svelte';
import { configureBrowserSchoolClient } from '$lib/api/school-client';
import { resetBootstrapSession } from '$lib/auth/bootstrap';
import { pageQueryStatus } from '$lib/queries/page-query-status.svelte';
import { getAppShellData } from '$lib/queries/shell.queries';

let bootstrapPromise: Promise<void> | null = null;

export function bootstrapAppShell(): Promise<void> {
	if (!bootstrapPromise) {
		bootstrapPromise = runBootstrapAppShell();
	}
	return bootstrapPromise;
}

export function resetAppShellBootstrap() {
	bootstrapPromise = null;
	resetBootstrapSession();
	academicContext.reset();
	pageQueryStatus.reset();
}

async function runBootstrapAppShell() {
	configureBrowserSchoolClient({
		getYearId: () => (academicContext.shellReady ? academicContext.yearId : undefined),
	});

	try {
		const shell = await getAppShellData();
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
