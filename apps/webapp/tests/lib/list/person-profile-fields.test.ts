import { describe, expect, test } from 'bun:test';
import { guardianIdentityPayload, personFieldDraft, studentIdentityPayload, teacherIdentityPayload } from '$lib/people-profile-fields';

describe('person profile patch preservation', () => {
    test('omitted optional fields do not mask existing values when merged into full-save payloads', () => {
        const existing = { identifier: '0012', sourceFullName: '  Aminata Mariam Koné-Diabaté  ', occupation: 'Teacher', globalIdentifier: '000019' };
        for (const patch of [studentIdentityPayload(), teacherIdentityPayload(), guardianIdentityPayload()]) expect({ ...existing, ...patch }).toEqual(existing);
    });
    test('unchanged school-entry dates are omitted so existing timestamps survive unrelated edits', () => {
        const previous = { enrollmentDate: '2026-09-03T00:00:00.000Z' };
        expect({ ...previous, ...studentIdentityPayload({ enrollmentDate: '2026-09-03' }, previous) }).toEqual(previous);
        expect(studentIdentityPayload({ enrollmentDate: '' }, previous).enrollmentDate).toBeNull();
    });
    test('original names and leading-zero identifiers round-trip while explicit blanks clear', () => {
        const person = { sourceFullName: '  Aminata Mariam Koné-Diabaté  ', identifier: '0012', occupation: 'Teacher' };
        expect(guardianIdentityPayload(personFieldDraft('guardian', person))).toEqual(person);
        expect(studentIdentityPayload({ globalIdentifier: '000019' }).globalIdentifier).toBe('000019');
        expect(guardianIdentityPayload({ occupation: '', sourceFullName: '' })).toEqual({ occupation: null, sourceFullName: null });
    });
});
