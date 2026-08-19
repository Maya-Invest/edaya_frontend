import type { DemoContext } from './types';

export function urlModalParam(ctx: DemoContext): string | null {
	return new URL(ctx.page.url()).searchParams.get('modal');
}

export async function waitForUrlModal(
	ctx: DemoContext,
	expected: string | null,
	{ absent = false, timeoutMs = 12_000 } = {},
): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const modal = urlModalParam(ctx);
		if (absent ? modal === null : modal === expected) {
			return true;
		}
		await ctx.page.waitForTimeout(120);
	}
	return false;
}

export async function waitForFormModal(ctx: DemoContext, timeoutMs = 30_000): Promise<boolean> {
	const dialog = ctx.page.getByTestId('form-modal');
	return dialog.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true).catch(() => false);
}

export async function waitForPickerModal(ctx: DemoContext, timeoutMs = 30_000): Promise<boolean> {
	const modal = ctx.page.getByTestId('picker-modal');
	return modal.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true).catch(() => false);
}

export async function closeFormModal(ctx: DemoContext): Promise<boolean> {
	const modal = ctx.page.getByTestId('form-modal');
	const cancelBtn = modal.getByTestId('form-modal-cancel').or(
		modal.getByRole('button', { name: /cancel|annuler/i }),
	);
	const visible = await cancelBtn.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false);
	if (!visible) {
		return false;
	}
	await cancelBtn.click();
	await modal.waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
	return true;
}
