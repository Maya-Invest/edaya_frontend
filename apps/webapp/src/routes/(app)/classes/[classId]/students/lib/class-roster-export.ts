interface CardRequest {
	sourceId: string;
	studentId: string;
	requestId: string;
	classGroupId: string;
}

interface ExportSelection {
	key: string;
	classId: string;
	studentIds: string[];
	assertCurrent: () => void;
}

interface DocumentRequests {
	roster: (requestId: string) => Promise<boolean>;
	cards: (items: CardRequest[]) => Promise<{ items: { sourceId: string; issuanceId?: string }[] } | null>;
}

/** Keep command identities across a retry of the same selection on this page. */
export class ClassRosterExport {
	private pending?: { key: string; rosterId: string; rosterRequested: boolean; cards: Map<string, CardRequest> };

	async request(selection: ExportSelection, documents: DocumentRequests) {
		const { classId, studentIds, assertCurrent } = selection;
		const key = JSON.stringify([selection.key, studentIds]);
		if (this.pending?.key !== key) {
			this.pending = {
				key,
				rosterId: crypto.randomUUID(),
				rosterRequested: false,
				cards: new Map(studentIds.map(studentId => [studentId, {
					studentId,
					sourceId: studentId,
					classGroupId: classId,
					requestId: crypto.randomUUID(),
				}])),
			};
		}
		const work = this.pending;
		assertCurrent();
		if (!work.rosterRequested) {
			work.rosterRequested = await documents.roster(work.rosterId);
			if (!work.rosterRequested)
				return;
		}
		const remaining = [...work.cards.values()];
		const batchSize = 50;
		for (let offset = 0; offset < remaining.length; offset += batchSize) {
			assertCurrent();
			const result = await documents.cards(remaining.slice(offset, offset + batchSize));
			if (!result)
				return;
			for (const item of result.items) {
				if (item.issuanceId)
					work.cards.delete(item.sourceId);
			}
		}
		if (work.cards.size)
			return work.cards.size;
		this.pending = undefined;
		return 0;
	}
}
