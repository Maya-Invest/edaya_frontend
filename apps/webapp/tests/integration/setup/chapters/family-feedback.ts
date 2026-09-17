import {
	openDialogButton,
	openUrlModal,
	waitForDialogClosed,
} from '../../../../scripts/qa-harness-ui';
import { firstFamilyFeedbackCampaignIdFromList } from '../../../../scripts/qa-matrix-support';
import { waitForDrawerAside } from '../../demo-dry-run/support/drawer';
import { ensureFamilyFeedbackCampaignViaApi } from '../journey-api';
import {
	coverActions,
	coverModal,
	logStep,
	visitCovered,
	type UiJourney,
} from '../journey-context';

const SETUP_MODALS = ['edit', 'assign-moderator', 'schedule', 'open', 'close', 'cancel'] as const;
const RESULTS_MODALS = ['publish', 'archive'] as const;

async function coverUrlModal(
	journey: UiJourney,
	parentRoute: string,
	pathname: string,
	modal: string,
): Promise<void> {
	const opened = await openUrlModal(journey.ctx.page, pathname, modal, { base: journey.ctx.base });
	coverModal(journey, parentRoute, modal, opened ? 'OK' : 'NOT OK');
	if (opened) {
		await journey.ctx.page.keyboard.press('Escape').catch(() => {});
		await waitForDialogClosed(journey.ctx.page).catch(() => {});
	}
}

export async function runFamilyFeedbackChapter(journey: UiJourney): Promise<void> {
	const { entities } = journey;
	const { page, base } = journey.ctx;
	console.log('\n--- Journey: family-feedback ---');

	let campaignId = await ensureFamilyFeedbackCampaignViaApi(page, base, {
		classGroupId: entities.classId,
		classSubjectId: entities.teachingId,
		teacherId: entities.teacherId,
		catalogSubjectId: entities.subjectId,
	});

	await visitCovered(journey, '/school/family-feedback', '/school/family-feedback');
	if (!campaignId) {
		campaignId = await firstFamilyFeedbackCampaignIdFromList(page);
	}
	entities.familyFeedbackCampaignId = campaignId;

	const createOpened = await openUrlModal(page, '/school/family-feedback', 'create', { base })
		|| await openDialogButton(page, /new campaign|nouvelle campagne|créer campagne|create campaign/i);
	coverModal(journey, '/school/family-feedback', 'create', createOpened ? 'OK' : 'NOT OK');
	if (createOpened) {
		await page.keyboard.press('Escape').catch(() => {});
		await waitForDialogClosed(page).catch(() => {});
	}
	coverActions(
		journey,
		'http://localhost:5173/school/family-feedback',
		['Liste — filtre statut', 'Créer campagne'],
		'OK',
	);

	if (!campaignId) {
		logStep(journey, { step: 'family-feedback', ok: false, detail: 'No campaign after assignment/create' });
		return;
	}

	const setupFatal = await visitCovered(
		journey,
		'/school/family-feedback/[id]/setup',
		`/school/family-feedback/${campaignId}/setup`,
	);
	const setupDrawer = setupFatal ? null : await waitForDrawerAside(journey.ctx);
	coverActions(
		journey,
		'http://localhost:5173/school/family-feedback/[id]/setup',
		['Paramétrage', 'Éditer calendrier', 'Désigner modérateur', 'Planifier / ouvrir / clôturer'],
		setupFatal || !setupDrawer ? 'NOT OK' : 'OK',
		setupFatal ?? (setupDrawer ? undefined : 'Drawer introuvable'),
	);
	for (const modal of SETUP_MODALS) {
		await coverUrlModal(
			journey,
			'/school/family-feedback/[id]/setup',
			`/school/family-feedback/${campaignId}/setup`,
			modal,
		);
	}

	const audienceFatal = await visitCovered(
		journey,
		'/school/family-feedback/[id]/audience',
		`/school/family-feedback/${campaignId}/audience`,
	);
	coverActions(
		journey,
		'http://localhost:5173/school/family-feedback/[id]/audience',
		['Audience'],
		audienceFatal ? 'NOT OK' : 'OK',
		audienceFatal ?? undefined,
	);

	const moderationFatal = await visitCovered(
		journey,
		'/school/family-feedback/[id]/moderation',
		`/school/family-feedback/${campaignId}/moderation`,
	);
	coverActions(
		journey,
		'http://localhost:5173/school/family-feedback/[id]/moderation',
		['Thèmes et commentaires'],
		moderationFatal ? 'NOT OK' : 'OK',
		moderationFatal ?? undefined,
	);
	await coverUrlModal(
		journey,
		'/school/family-feedback/[id]/moderation',
		`/school/family-feedback/${campaignId}/moderation`,
		'theme',
	);

	const resultsFatal = await visitCovered(
		journey,
		'/school/family-feedback/[id]/results',
		`/school/family-feedback/${campaignId}/results`,
	);
	coverActions(
		journey,
		'http://localhost:5173/school/family-feedback/[id]/results',
		['Agrégats et publication'],
		resultsFatal ? 'NOT OK' : 'OK',
		resultsFatal ?? undefined,
	);
	for (const modal of RESULTS_MODALS) {
		await coverUrlModal(
			journey,
			'/school/family-feedback/[id]/results',
			`/school/family-feedback/${campaignId}/results`,
			modal,
		);
	}

	logStep(journey, {
		step: 'family-feedback',
		ok: true,
		detail: campaignId,
		entityId: campaignId,
	});
}
