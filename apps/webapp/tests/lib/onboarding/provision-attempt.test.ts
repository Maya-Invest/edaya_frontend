import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createDatasetDraft as createEmptyDraft } from './dataset-fixture';
import {
	clearProvisionAttempt,
	isProvisionAttemptCommitted,
	loadProvisionAttempt,
	markProvisionAttemptCommitted,
	resolveProvisionAttempt,
 saveProvisionAttempt,
} from '$lib/onboarding/provision-attempt';

function mockWebStorage() {
	function createStore() {
		const store = new Map<string, string>();
		return {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
		};
	}

	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: createStore(),
	});
	Object.defineProperty(globalThis, 'sessionStorage', {
		configurable: true,
		value: createStore(),
	});
}

describe('provision attempt identity', () => {
	beforeEach(() => {
		mockWebStorage();
	});

	afterEach(() => {
		Reflect.deleteProperty(globalThis, 'localStorage');
		Reflect.deleteProperty(globalThis, 'sessionStorage');
	});

	it('reuses school and request ids for the same draft', () => {
		const draft = createEmptyDraft();
		draft.school.name = 'Lycée EDAYA';
		const first = resolveProvisionAttempt('user-1', draft);
		const second = resolveProvisionAttempt('user-1', draft);
		expect(second.schoolId).toBe(first.schoolId);
		expect(second.requestId).toBe(first.requestId);
	});

	it('requires reconciliation before replacing a changed attempt and retains the school identity', () => {
		const draft = createEmptyDraft();
		draft.school.name = 'School A';
		const first = resolveProvisionAttempt('user-1', draft);
		draft.school.name = 'School B';
		expect(() => resolveProvisionAttempt('user-1', draft)).toThrow('RECONCILIATION_REQUIRED');
 const second = resolveProvisionAttempt('user-1', draft, true);
		expect(second.schoolId).toBe(first.schoolId);
		expect(second.requestId).not.toBe(first.requestId);
	});

 it('retains a v7 attempt after dropping obsolete mappings and pinning the implicit dataset', () => {
  const draft = createEmptyDraft();
  const original = resolveProvisionAttempt('user-1', draft);
  const legacy = JSON.parse(original.fingerprint);
  delete legacy.structure.dataset;
  legacy.structure.disciplineMappings = [{subjectCode: 'FR', disciplineCode: '', disciplineName: ''}];
  saveProvisionAttempt('user-1', {...original, fingerprint: JSON.stringify(legacy)});
  expect(resolveProvisionAttempt('user-1', draft)).toMatchObject({schoolId: original.schoolId, requestId: original.requestId});
  expect(JSON.parse(loadProvisionAttempt('user-1')!.fingerprint).structure).not.toHaveProperty('disciplineMappings');
 });

	it('keeps committed ids after a later draft edit', () => {
		const draft = createEmptyDraft();
		draft.school.name = 'School A';
		const first = resolveProvisionAttempt('user-1', draft);
		markProvisionAttemptCommitted('user-1', first.schoolId);
		draft.school.name = 'School B';
		const second = resolveProvisionAttempt('user-1', draft);
		expect(second.schoolId).toBe(first.schoolId);
		expect(second.requestId).toBe(first.requestId);
		expect(isProvisionAttemptCommitted('user-1')).toBe(true);
		expect(loadProvisionAttempt('user-1')?.committed).toBe(true);
		clearProvisionAttempt('user-1');
		expect(loadProvisionAttempt('user-1')).toBeNull();
	});
});
