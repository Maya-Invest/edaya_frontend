import { describe, expect, test } from 'bun:test'
import { createEmptyDraft } from '$lib/onboarding/draft-storage'

describe('onboarding draft consortium fields', () => {
	test('empty draft starts without path choice', () => {
		const draft = createEmptyDraft()
		expect(draft.pathChoice).toBeNull()
		expect(draft.pathChoiceSubmitted).toBe(false)
		expect(draft.consortiumId).toBeNull()
		expect(draft.consortiumName).toBe('')
		expect(draft.version).toBe(5)
	})
})
