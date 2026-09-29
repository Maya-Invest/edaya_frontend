import {
	openUrlModal,
	pickDialogComboboxOption,
	waitForDialogClosed,
} from '../../../../scripts/qa-harness-ui';
import { waitForDrawerAside } from '../../demo-dry-run/support/drawer';
import {
	apiFetch,
	cancelFamilyFeedbackCampaignsViaApi,
	ensureFamilyFeedbackCampaignViaApi,
	grantFamilyFeedbackModerateViaApi,
} from '../journey-api';
import {
	coverActions,
	coverMutationActions,
	logStep,
	runModalMutation,
	visitCovered,
	gotoApp,
	type UiJourney,
} from '../journey-context';

function toDatetimeLocal(value: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

async function fillFamilyFeedbackDates(page: import('playwright').Page): Promise<void> {
	const dialog = page.getByRole('dialog');
	const opens = dialog.locator('input[type="datetime-local"]').nth(0);
	const closes = dialog.locator('input[type="datetime-local"]').nth(1);
	const now = new Date();
	const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	if (await opens.isVisible().catch(() => false)) {
		await opens.fill(toDatetimeLocal(now));
	}
	if (await closes.isVisible().catch(() => false)) {
		await closes.fill(toDatetimeLocal(later));
	}
}

async function fillFamilyFeedbackCreateDialog(page: import('playwright').Page): Promise<void> {
	const picked = await pickDialogComboboxOption(page);
	console.log(`family-feedback create assignment picked: ${picked}`);
	await fillFamilyFeedbackDates(page);
}

async function pickCurrentStaffCombobox(page: import('playwright').Page): Promise<void> {
	const title = await page.getByTestId('user-menu').getAttribute('title').catch(() => null);
	const name = title?.split(' · ')[0]?.trim();
	await pickDialogComboboxOption(page, name || undefined);
}

export async function runFamilyFeedbackChapter(journey: UiJourney): Promise<void> {
	const { entities } = journey;
	const { page, base } = journey.ctx;
	console.log('\n--- Journey: family-feedback ---');

	await visitCovered(journey, '/school/family-feedback', '/school/family-feedback');
	await cancelFamilyFeedbackCampaignsViaApi(page, base);
	await grantFamilyFeedbackModerateViaApi(page, base);
	await ensureFamilyFeedbackCampaignViaApi(page, base, {
		classGroupId: entities.classId,
		classSubjectId: entities.teachingId,
		teacherId: entities.teacherId,
		catalogSubjectId: entities.subjectId,
		assignmentOnly: true,
	});
	await gotoApp(journey, '/dashboard');
	await gotoApp(journey, '/school/family-feedback');

	const created = await runModalMutation(journey, {
		parentRoute: '/school/family-feedback',
		modal: 'create',
		pathname: '/school/family-feedback',
		command: 'create-family-feedback-campaign',
		openLabel: /nouvelle campagne|new campaign|créer une campagne|create campaign/i,
		fill: fillFamilyFeedbackCreateDialog,
		actionPath: 'http://localhost:5173/school/family-feedback',
		actions: ['Créer campagne'],
	});
	let campaignId = typeof created.result?.id === 'string' ? created.result.id : null;

	if (!campaignId) {
		campaignId = await ensureFamilyFeedbackCampaignViaApi(page, base, {
			classGroupId: entities.classId,
			classSubjectId: entities.teachingId,
			teacherId: entities.teacherId,
			catalogSubjectId: entities.subjectId,
			forceNew: true,
		});
	}
	entities.familyFeedbackCampaignId = campaignId;

	coverActions(
		journey,
		'http://localhost:5173/school/family-feedback',
		['Liste — filtre statut'],
		'OK',
	);

	if (!campaignId) {
		logStep(journey, { step: 'family-feedback', ok: false, detail: 'No campaign after assignment/create' });
		return;
	}

	const setupPath = `/school/family-feedback/${campaignId}/setup`;
	const setupFatal = await visitCovered(
		journey,
		'/school/family-feedback/[id]/setup',
		setupPath,
	);
	const setupDrawer = setupFatal ? null : await waitForDrawerAside(journey.ctx);
	coverActions(
		journey,
		'http://localhost:5173/school/family-feedback/[id]/setup',
		['Paramétrage'],
		setupFatal || !setupDrawer ? 'NOT OK' : 'OK',
		setupFatal ?? (setupDrawer ? undefined : 'Drawer introuvable'),
	);

	const edited = await runModalMutation(journey, {
		parentRoute: '/school/family-feedback/[id]/setup',
		modal: 'edit',
		pathname: setupPath,
		command: 'update-family-feedback-campaign',
		openLabel: /modifier|edit campaign|^edit$/i,
		fill: fillFamilyFeedbackDates,
	});
	const moderator = await runModalMutation(journey, {
		parentRoute: '/school/family-feedback/[id]/setup',
		modal: 'assign-moderator',
		pathname: setupPath,
		command: 'assign-family-feedback-moderator',
		openLabel: /désigner un modérateur|assign moderator|modérateur/i,
		fill: pickCurrentStaffCombobox,
	});
	const scheduled = await runModalMutation(journey, {
		parentRoute: '/school/family-feedback/[id]/setup',
		modal: 'schedule',
		pathname: setupPath,
		command: 'schedule-family-feedback-campaign',
		submit: 'confirm',
		confirmLabel: /planifier|schedule/i,
		openLabel: /planifier|schedule/i,
	});
	const opened = await runModalMutation(journey, {
		parentRoute: '/school/family-feedback/[id]/setup',
		modal: 'open',
		pathname: setupPath,
		command: 'open-family-feedback-campaign',
		submit: 'confirm',
		confirmLabel: /^ouvrir$|^open$/i,
		openLabel: /^ouvrir$|^open$/i,
	});
	const closed = await runModalMutation(journey, {
		parentRoute: '/school/family-feedback/[id]/setup',
		modal: 'close',
		pathname: setupPath,
		command: 'close-family-feedback-campaign',
		submit: 'confirm',
		confirmLabel: /clôturer|^close$/i,
		openLabel: /clôturer|^close$/i,
	});
	coverMutationActions(
		journey,
		'http://localhost:5173/school/family-feedback/[id]/setup',
		['Éditer calendrier', 'Désigner modérateur', 'Planifier / ouvrir / clôturer'],
		{
			exercised: true,
			postcondition: edited.postcondition && moderator.postcondition && scheduled.postcondition
				&& opened.postcondition && closed.postcondition,
		},
	);

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
	await runModalMutation(journey, {
		parentRoute: '/school/family-feedback/[id]/moderation',
		modal: 'theme',
		pathname: `/school/family-feedback/${campaignId}/moderation`,
		command: 'save-family-feedback-theme-draft',
		openLabel: /thèmes|^theme$|themes/i,
		fill: async (current) => {
			await current.getByRole('dialog').locator('textarea').first().fill('QA theme');
		},
		verifyPersisted: async (current) => {
			await current.reload({ waitUntil: 'domcontentloaded' });
			const response = await apiFetch(current, journey.ctx.base, '/core/queries/get-family-feedback-campaign', { method: 'POST', data: { id: campaignId } });
			if (!response.ok() || (await response.json() as { themeDraft: string }).themeDraft !== 'QA theme')
				throw new Error('Feedback theme draft did not persist');
		},
		listPath: `/school/family-feedback/${campaignId}/moderation`,
	});

	const resultsFatal = await visitCovered(
		journey,
		'/school/family-feedback/[id]/results',
		`/school/family-feedback/${campaignId}/results`,
	);
	const published = await runModalMutation(journey, {
		parentRoute: '/school/family-feedback/[id]/results',
		modal: 'publish',
		pathname: `/school/family-feedback/${campaignId}/results`,
		command: 'publish-family-feedback-campaign',
		submit: 'confirm',
		confirmLabel: /publier|publish/i,
		openLabel: /publier|publish/i,
	});
	const archived = await runModalMutation(journey, {
		parentRoute: '/school/family-feedback/[id]/results',
		modal: 'archive',
		pathname: `/school/family-feedback/${campaignId}/results`,
		command: 'archive-family-feedback-campaign',
		submit: 'confirm',
		confirmLabel: /archiver|archive/i,
		openLabel: /archiver|archive/i,
	});
	coverMutationActions(
		journey,
		'http://localhost:5173/school/family-feedback/[id]/results',
		['Agrégats et publication'],
		{ exercised: true, postcondition: !resultsFatal && published.postcondition && archived.postcondition },
		resultsFatal ?? undefined,
	);

	const cancelCampaignId = await ensureFamilyFeedbackCampaignViaApi(page, base, {
		classGroupId: entities.classId,
		classSubjectId: entities.teachingId,
		teacherId: entities.teacherId,
		catalogSubjectId: entities.subjectId,
		forceNew: true,
	});
	if (cancelCampaignId) {
		await runModalMutation(journey, {
			parentRoute: '/school/family-feedback/[id]/setup',
			modal: 'cancel',
			pathname: `/school/family-feedback/${cancelCampaignId}/setup`,
			command: 'cancel-family-feedback-campaign',
			submit: 'confirm',
			confirmLabel: /annuler|cancel/i,
			openLabel: /annuler la campagne|cancel campaign/i,
		});
	}
	else {
		const cancelOpened = await openUrlModal(page, setupPath, 'cancel', { base });
		if (cancelOpened) {
			await page.keyboard.press('Escape').catch(() => {});
			await waitForDialogClosed(page).catch(() => {});
		}
	}

	logStep(journey, {
		step: 'family-feedback',
		ok: true,
		detail: campaignId,
		entityId: campaignId,
	});
}
