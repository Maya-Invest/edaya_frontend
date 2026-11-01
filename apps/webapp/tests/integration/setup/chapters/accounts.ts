import { createConversationFixture } from '../conversation-fixture';
import { provisionSecondaryAccounts } from '../../support/secondary-accounts';
import { logStep, type UiJourney } from '../journey-context';

export async function runAccountsChapter(journey: UiJourney): Promise<void> {
	console.log('\n--- Journey: secondary accounts ---');
	const accounts = await provisionSecondaryAccounts(journey, journey.entities);
	if (!accounts.teacher || !accounts.educator) {
		throw new Error(
			`Secondary accounts incomplete: ${accounts.teacher ? `teacher=${accounts.teacher.email}` : 'teacher=missing'} ${accounts.educator ? `educator=${accounts.educator.email}` : 'educator=missing'}`,
		);
	}
	journey.entities.secondaryAccounts = accounts;
	await createConversationFixture(journey);
	logStep(journey, {
		step: 'secondary-accounts',
		ok: true,
		detail: `teacher=${accounts.teacher.email} educator=${accounts.educator.email}`,
	});
}
