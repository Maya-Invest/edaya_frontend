import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DemoSummary, StepResult, StepStatus } from './types';

export class DemoReporter {
	readonly results: StepResult[] = [];

	log(scene: string, step: string, status: StepStatus, detail?: string): void {
		this.results.push({ scene, step, status, detail });
		const mark = status === 'pass' ? '✓' : status === 'skip' ? '○' : '✗';
		console.log(`${mark} [${scene}] ${step}${detail ? ` — ${detail}` : ''}`);
	}

	summarize(consoleErrors: string[]): DemoSummary {
		return {
			passed: this.results.filter(r => r.status === 'pass').length,
			failed: this.results.filter(r => r.status === 'fail').length,
			skipped: this.results.filter(r => r.status === 'skip').length,
			results: this.results,
			consoleErrors: [...new Set(consoleErrors)].slice(0, 30),
		};
	}

	printSummary(summary: DemoSummary): void {
		console.log('\n--- Summary ---');
		console.log(`Pass: ${summary.passed}  Fail: ${summary.failed}  Skip: ${summary.skipped}`);
		if (summary.consoleErrors.length) {
			console.log('Console errors (sample):', summary.consoleErrors.slice(0, 5).join(' | '));
		}
	}

	async writeResults(outDir: string, summary: DemoSummary): Promise<void> {
		await writeFile(path.join(outDir, 'results.json'), JSON.stringify(summary, null, 2));
	}
}
