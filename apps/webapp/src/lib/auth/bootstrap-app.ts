import { academicContext } from '$lib/academic/context.svelte';
import { configureBrowserSchoolClient } from '$lib/api/school-client';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { disciplineCatalogContext } from '$lib/discipline-catalog/context.svelte';
import { pageQueryStatus } from '$lib/queries/page-query-status.svelte';
import { getAppShellData } from '$lib/queries/shell.queries';
import { reportCardsContext } from '$lib/report-cards/context.svelte';
import { sessionDetailContext } from '$lib/session-detail/context.svelte';
import { teachingLogContext } from '$lib/teaching-log/context.svelte';

let bootstrapPromise: Promise<void> | null = null;

export function bootstrapAppShell(): Promise<void> {
	if (!bootstrapPromise) {
		bootstrapPromise = runBootstrapAppShell();
	}
	return bootstrapPromise;
}

export function resetAppShellBootstrap() {
	bootstrapPromise = null;
	academicContext.reset();
	detailDataContext.reset();
	reportCardsContext.reset();
	disciplineCatalogContext.reset();
	teachingLogContext.reset();
	sessionDetailContext.reset();
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
