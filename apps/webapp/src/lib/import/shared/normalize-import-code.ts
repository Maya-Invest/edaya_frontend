/** Shared normalization for import identity codes (person codes, payment references, etc.). */
export function normalizeImportCode(value: string): string {
	return value.trim().toLowerCase();
}
