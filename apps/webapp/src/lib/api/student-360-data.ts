import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { HealthRecord, PedagogicalNote } from '$lib/types/school';
import { recordsForStudent } from '$lib/api/entity-list-filters';
import { formatDateInput } from '$lib/date/format';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type StudentHealthProfileRaw = components['schemas']['StudentHealthProfile'];
type StudentNoteRaw = components['schemas']['StudentNote'];

const NOTE_CATEGORY_TO_UI: Record<string, PedagogicalNote['category']> = {
	behavior: 'Comportement',
	work: 'Travail',
	progress: 'Progression',
	encouragement: 'Encouragement',
};

function formatDate(value: unknown): string {
	if (!value) {
		return '';
	}
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === 'string') {
		return value.slice(0, 10);
	}
	return String(value).slice(0, 10);
}

function splitHealthList(value?: string | null | string[]): string[] {
	if (!value || value === 'Aucune') {
		return [];
	}
	if (Array.isArray(value)) {
		return value.map(entry => entry.trim()).filter(Boolean);
	}
	return value.split(',').map(entry => entry.trim()).filter(Boolean);
}

export function mapNoteCategory(
	category?: string | null,
	title?: string | null,
): PedagogicalNote['category'] {
	if (category && category in NOTE_CATEGORY_TO_UI) {
		return NOTE_CATEGORY_TO_UI[category];
	}

	if (title && Object.values(NOTE_CATEGORY_TO_UI).includes(title as PedagogicalNote['category'])) {
		return title as PedagogicalNote['category'];
	}

	return 'Travail';
}

export function mapHealthProfiles(profilesRaw: StudentHealthProfileRaw[]): Record<string, HealthRecord> {
	const records: Record<string, HealthRecord> = {};

	for (const profile of profilesRaw) {
		records[profile.studentId] = {
			id: profile.id,
			studentId: profile.studentId,
			bloodType: profile.bloodType ?? '—',
			allergies: splitHealthList(profile.allergies),
			medications: splitHealthList(profile.medications),
			chronicConditions: splitHealthList(profile.medicalConditions),
			medicalConditionsText: profile.medicalConditions ?? '',
			allergiesText: profile.allergies ?? '',
			medicationsText: profile.medications ?? '',
			lastVisit: formatDateInput(profile.lastVisit),
			emergencyProtocols: profile.emergencyProtocols ?? '',
			notes: profile.clinicalNotes ?? '',
		};
	}

	return records;
}

export function mapPedagogicalNotes(notesRaw: StudentNoteRaw[]): PedagogicalNote[] {
	return notesRaw
		.map(note => ({
			id: note.id,
			studentId: note.studentId,
			date: formatDate(note.createdAt),
			authorId: note.authorStaffId,
			category: mapNoteCategory(note.category, note.title),
			content: note.body,
			title: note.title,
			visibility: note.visibility,
		}))
		.sort((left, right) => right.date.localeCompare(left.date));
}

export async function loadStudent360Data(
	client: SchoolClient,
	studentId: string,
): Promise<{
	healthRecord: HealthRecord | undefined;
	pedagogicalNotes: PedagogicalNote[];
}> {
	const filter = recordsForStudent(studentId);
	const [
		profilesRaw,
		notesRaw,
	] = await Promise.all([
		client.entities.studentHealthProfiles.list(filter),
		client.entities.studentNotes.list(filter),
	]);

	const healthRecords = mapHealthProfiles(profilesRaw ?? []);

	return {
		healthRecord: healthRecords[studentId],
		pedagogicalNotes: mapPedagogicalNotes(notesRaw ?? []),
	};
}
