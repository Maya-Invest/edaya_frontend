/**
 * Run existing per-record operations without inventing a batch transaction.
 * Successful targets are removed; failed and unattempted targets remain retryable.
 */
export async function runSelectionOperation<T>(
	targets: readonly T[],
	perform: (target: T) => Promise<boolean>,
	isCurrent: () => boolean = () => true,
): Promise<{ succeeded: T[]; remaining: T[] }> {
	const submitted = [...targets];
	const succeeded: T[] = [];
	const remaining: T[] = [];
	for (const [index, target] of submitted.entries()) {
		if (!isCurrent()) {
			remaining.push(...submitted.slice(index));
			break;
		}
		try {
			(await perform(target) ? succeeded : remaining).push(target);
		}
		catch {
			remaining.push(target);
		}
	}
	return { succeeded, remaining };
}
