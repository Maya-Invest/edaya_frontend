import { configClassGroupPath } from '../support/paths';
import {
	DRAWER_TAB_ROUTE_CASES,
	classEvaluationsTabCase,
	classTimetableTabCase,
} from '../support/tab-matrix';
import {
	assertDrawerCloseReturnsToList,
	walkDrawerTabRoute,
} from '../support/tab-walker';
import { resolveEvaluationId } from '../support/evaluation-resolve';
import { resolveTimetableSessionId } from '../support/timetable-session';
import type { DemoContext } from '../support/types';

/** URL-backed drawer tabs: deep links, click sync, close strips tab segment. */
export async function runDrawerTabChecks(ctx: DemoContext): Promise<void> {
	const scene = 'DD';

	for (const routeCase of DRAWER_TAB_ROUTE_CASES) {
		await walkDrawerTabRoute(ctx, scene, routeCase);
	}

	const evaluationId = await resolveEvaluationId(ctx);
	if (evaluationId) {
		await walkDrawerTabRoute(ctx, scene, classEvaluationsTabCase(evaluationId));
	}
	else {
		ctx.reporter.log(
			scene,
			'class evaluations tabs',
			'skip',
			'No evaluation rows in list for current academic period',
		);
	}

	const sessionId = await resolveTimetableSessionId(ctx);
	if (sessionId) {
		await walkDrawerTabRoute(ctx, scene, classTimetableTabCase(sessionId));
	}
	else {
		ctx.reporter.log(
			scene,
			'timetable session tabs',
			'skip',
			'No timetable session link found in grid — verify seed week',
		);
	}

	await assertDrawerCloseReturnsToList(
		ctx,
		scene,
		DRAWER_TAB_ROUTE_CASES.find(route => route.name === 'configuration classes')!,
		'/configuration/classes',
	);
}
