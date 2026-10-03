import type { Page, Request } from 'playwright';
import { DEV_DEMO_LOGIN_ACCOUNTS } from '@edaya/web-fixtures/demo-login';

/** Development-only picker: choosing an account must not start authentication. */
export async function runDemoAccountPicker(page: Page, base: string): Promise<boolean> {
	await page.goto(`${base}/login/demo`);
	if (!new URL(page.url()).pathname.endsWith('/login/demo'))
		return false;
	await page.getByTestId('demo-account-list').waitFor();
	if (await page.getByTestId('demo-account').count() !== DEV_DEMO_LOGIN_ACCOUNTS.length)
		throw new Error('Demo staff accounts are missing');
	let mutations = 0;
	const track = (request: Request) => {
		if (request.method() === 'POST' && request.url().includes('/auth/'))
			mutations++;
	};
	page.on('request', track);
	try {
		for (const account of DEV_DEMO_LOGIN_ACCOUNTS.slice(0, 2)) {
			await page.locator(`[data-testid="demo-account"][data-account-id="${account.staffId}"]`).click();
			const panel = page.getByTestId('auth-panel');
			await panel.waitFor();
			if (await panel.getAttribute('data-state') !== 'form'
				|| await panel.getByTestId('auth-identifier').inputValue() !== account.email
				|| await page.locator('input[type="password"]').count())
				throw new Error('Demo selection did not use the normal prefilled OTP form');
			await panel.getByTestId('auth-identifier').fill('+2250712345678');
			await page.getByTestId('demo-change-account').click();
			await page.getByTestId('demo-account-list').waitFor();
			if (await page.getByTestId('auth-panel').count())
				throw new Error('Changing demo accounts retained the previous authentication panel');
		}
		if (mutations)
			throw new Error('Choosing a demo account started authentication automatically');
	}
	finally {
		page.off('request', track);
	}
	return true;
}
