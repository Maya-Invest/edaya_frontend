const CHAPTER_SUMMARY_PREVIEW_LIMIT = 3;

export function buildSubjectChapterSummary(chapterNames: readonly string[]): string {
	const titles = chapterNames.map(name => name.trim()).filter(name => name.length > 0);
	if (titles.length === 0) {
		return '';
	}

	const preview = titles.slice(0, CHAPTER_SUMMARY_PREVIEW_LIMIT).join(' · ');
	if (titles.length > CHAPTER_SUMMARY_PREVIEW_LIMIT) {
		return `${preview} (+${titles.length - CHAPTER_SUMMARY_PREVIEW_LIMIT})`;
	}

	return preview;
}
