export interface OnboardingTimingMeta {
	[key: string]: string | number | boolean | null | undefined;
}

export interface OnboardingTimingEntry {
	step: string;
	phase: string;
	ms: number;
	meta?: OnboardingTimingMeta;
}

const PREFIX = '[onboarding-timing]';

function isTimingEnabled(): boolean {
	return import.meta.env.DEV;
}

export function logOnboardingTiming(entry: OnboardingTimingEntry): void {
	if (!isTimingEnabled()) {
		return;
	}
	const meta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';
	console.info(`${PREFIX} ${entry.step}.${entry.phase} ${entry.ms.toFixed(1)}ms${meta}`);
}

export async function timeOnboardingPhase<T>(
	step: string,
	phase: string,
	run: () => Promise<T>,
	meta?: OnboardingTimingMeta,
): Promise<T> {
	const started = performance.now();
	try {
		return await run();
	}
	finally {
		logOnboardingTiming({
			step,
			phase,
			ms: performance.now() - started,
			...(meta ? { meta } : {}),
		});
	}
}
