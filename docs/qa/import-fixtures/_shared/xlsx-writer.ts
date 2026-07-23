import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const webappRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../../apps/webapp');
const require = createRequire(join(webappRoot, 'package.json'));
const XLSX = require('xlsx') as typeof import('xlsx');

export type FixtureRow = (string | number)[];

export function createXlsxWriter(outDir: string, sheetName: string) {
	mkdirSync(outDir, { recursive: true });

	return function writeFixture(filename: string, headers: readonly string[], rows: FixtureRow[]) {
		const workbook = XLSX.utils.book_new();
		const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
		XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
		const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
		const target = join(outDir, filename);
		try {
			writeFileSync(target, buffer);
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code === 'EBUSY' || code === 'EPERM') {
				console.warn(`Skipped ${filename} (file open elsewhere — close it and re-run)`);
				return;
			}
			throw error;
		}
	};
}
