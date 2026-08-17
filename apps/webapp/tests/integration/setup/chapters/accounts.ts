import { provisionSecondaryAccounts } from '../../support/secondary-accounts';
import { logStep, type UiJourney } from '../journey-context';

export async function runAccountsChapter(journey: UiJourney): Promise<void> {
	console.log('\n--- Journey: secondary accounts ---');
	const accounts = await provisionSecondaryAccounts(journey, journey.entities);
	journey.entities.secondaryAccounts = accounts ?? undefined;
	logStep(journey, {
		step: 'secondary-accounts',
		ok: Boolean(accounts?.teacher && accounts?.educator),
		detail: accounts
			? [
				accounts.teacher ? `teacher=${accounts.teacher.email}` : 'teacher=missing',
				accounts.educator ? `educator=${accounts.educator.email}` : 'educator=missing',
			].join(' ')
			: 'Provisioning incomplete',
	});
}
