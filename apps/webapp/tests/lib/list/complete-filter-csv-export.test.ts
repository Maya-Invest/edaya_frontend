import { describe, expect, it } from 'bun:test';
import { listAllEntityPages } from '$lib/api/entity-list-filters';
import { csvText, exportMatchingList, loadMatchingCollection } from '$lib/list/list-csv-export';
import { parseCivilDate, formatLocaleDate } from '$lib/date/format';
import { collectedTotalsByCurrency, formatPaymentCivilDate } from '../../../src/routes/(app)/finance/payment/lib/payment-helpers';

describe('collected totals by currency', () => {
	it('keeps mixed currencies as separate totals when the first row is filtered out', () => {
		const payments = [
			{ status: 'recorded' as const, kind: 'receipt' as const, amount: 100, currency: 'EUR' },
			{ status: 'recorded' as const, kind: 'receipt' as const, amount: 2500, currency: 'XOF' },
			{ status: 'reversed' as const, kind: 'receipt' as const, amount: 50, currency: 'EUR' },
		];
		expect(collectedTotalsByCurrency(payments)).toEqual([
			{ currency: 'EUR', amount: 100 },
			{ currency: 'XOF', amount: 2500 },
		]);
		expect(collectedTotalsByCurrency(payments.slice(1))).toEqual([
			{ currency: 'XOF', amount: 2500 },
		]);
	});
});

describe('payment civil dates', () => {
	it('keeps YYYY-MM-DD on the civil day instead of UTC midnight', () => {
		const civil = parseCivilDate('2026-03-10');
		expect(civil.getFullYear()).toBe(2026);
		expect(civil.getMonth()).toBe(2);
		expect(civil.getDate()).toBe(10);
		expect(formatPaymentCivilDate('2026-03-10', 'en-CA')).toBe(
			formatLocaleDate('2026-03-10', 'en-CA', { day: 'numeric', month: 'short', year: '2-digit' }),
		);
	});

	it('formats the same civil day in UTC, America/Toronto, and a positive offset', () => {
		const isoNoon = new Date('2026-03-10T12:00:00Z');
		for (const timeZone of ['UTC', 'America/Toronto', 'Europe/Paris']) {
			const parts = new Intl.DateTimeFormat('en-CA', {
				timeZone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
			}).formatToParts(isoNoon);
			const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
			expect(value('year')).toBe('2026');
			expect(value('month')).toBe('03');
			expect(value('day')).toBe('10');
		}
	});
});

describe('complete-filter CSV export', () => {
	it('loads every matching page and toasts the exported count', async () => {
		const catalog = Array.from({ length: 51 }, (_, index) => ({
			id: `row-${index + 1}`,
			status: index === 0 ? 'draft' : 'active',
			name: `Item ${index + 1}`,
		}));
		const fetches: Array<{ limit: number; offset: number; status?: string }> = [];
		const toast = await import('$lib/toast.svelte').then(module => module.toast);
		const messages: string[] = [];
		const originalSuccess = toast.success.bind(toast);
		toast.success = (message: string) => {
			messages.push(message);
		};

		const downloads: { filename: string; csv: string }[] = [];
		const blobs = new Map<string, Blob>();
		const previousDocument = globalThis.document;
		const previousCreateObjectURL = URL.createObjectURL;
		const previousRevokeObjectURL = URL.revokeObjectURL;
		Object.defineProperty(globalThis, 'document', {
			configurable: true,
			value: {
				createElement(tag: string) {
					if (tag !== 'a') {
						throw new Error(`unexpected element ${tag}`);
					}
					return {
						href: '',
						download: '',
						click() {
							downloads.push({ filename: this.download, csv: '' });
							const blob = blobs.get(this.href);
							if (blob) {
								void blob.text().then((csv) => {
									const last = downloads.at(-1);
									if (last) {
										last.csv = csv;
									}
								});
							}
						},
					};
				},
			},
		});
		URL.createObjectURL = ((blob: Blob) => {
			const href = `blob:${blobs.size}`;
			blobs.set(href, blob);
			return href;
		}) as typeof URL.createObjectURL;
		URL.revokeObjectURL = () => {};

		try {
			const count = await exportMatchingList({
				filename: 'catalog.csv',
				headers: ['id', 'name'],
				loadAll: async () => {
					const rows = await listAllEntityPages(
						async (query) => {
							fetches.push({
								limit: Number(query.$limit ?? 0),
								offset: Number(query.$offset ?? 0),
								status: typeof query.status === 'string' ? query.status : undefined,
							});
							const limit = Number(query.$limit ?? 50);
							const offset = Number(query.$offset ?? 0);
							return catalog
								.filter(row => row.status === 'active')
								.slice(offset, offset + limit);
						},
						{ pageSize: 50, baseQuery: { status: 'active' } },
					);
					return rows.map(row => [row.id, row.name]);
				},
			});

			expect(count).toBe(50);
			expect(fetches).toEqual([
				{ limit: 50, offset: 0, status: 'active' },
				{ limit: 50, offset: 50, status: 'active' },
			]);
			expect(messages.some(message => message.includes('50'))).toBe(true);
			expect(downloads[0]?.filename).toBe('catalog.csv');
			expect(csvText([['id', 'name'], ['row-2', 'Item 2']]).startsWith('id,name')).toBe(true);
		}
		finally {
			toast.success = originalSuccess;
			Object.defineProperty(globalThis, 'document', {
				configurable: true,
				value: previousDocument,
			});
			URL.createObjectURL = previousCreateObjectURL;
			URL.revokeObjectURL = previousRevokeObjectURL;
		}
	});

	it('pages a 51-row matching set to completion', async () => {
		let complete: number[] = [];
		const loaded = Array.from({ length: 50 }, (_, index) => index + 1);
		const rows = await loadMatchingCollection({
			isComplete: () => complete.length >= 51 || loaded.length >= 51,
			ensureComplete: async () => {
				complete = Array.from({ length: 51 }, (_, index) => index + 1);
			},
			current: () => (complete.length > 0 ? complete : loaded).filter(value => value !== 1),
		});
		expect(rows).toHaveLength(50);
		expect(rows[0]).toBe(2);
		expect(rows.at(-1)).toBe(51);
	});
});
