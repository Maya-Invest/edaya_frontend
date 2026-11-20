import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { CATALOG_LIST_PAGE_SIZE } from '$lib/api/entity-list-filters';
import {
	loadAbsences,
	loadCalendarEvents,
	loadIncidentRouteData,
	loadIncidentResolveModalData,
} from '$lib/api/school-life-data';
import { createRecordingSchoolClient, entityListRequests } from '$tests/support/recording-school-client';

const academicYearId = 'year-1';
const classGroupId = 'class-6a';

function paged(body: Record<string, unknown>) {
	return {
		...body,
		$limit: CATALOG_LIST_PAGE_SIZE,
		$offset: 0,
	};
}

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

describe('school-life data loading', () => {
	it('opens incident resolution with its participants and sanctions without loading a pupil directory', async () => {
		for (const placement of [{ classGroupId }, {}]) {
			const incident = { id: 'incident', schoolId: SEED_SCHOOL_ID, title: 'Fixture', description: 'Example', date: '2026-05-01', kind: 'minor_infraction' as const, status: 'open' as const, reporterId: 'staff', ...placement };
			const involved = { id: 'involvement', incidentId: incident.id, studentId: 'student-1', role: 'subject' as const };
			const sanction = { id: 'suspension', schoolId: SEED_SCHOOL_ID, name: 'Suspension', kind: 'sanction' as const };
			const { client, requests } = createRecordingSchoolClient([
				{ data: incident }, listEnvelope([involved]), listEnvelope([sanction, { id: 'other', kind: 'reward' }]),
			]);
			const result = await loadIncidentResolveModalData(client, incident.id);
			expect(result).toEqual({ incident, involvements: [involved], disciplinaryActions: [sanction] });
			expect(requests).toHaveLength(3);
		}
	});

	it('loads calendar events for the active academic year', async () => {
		const { client, requests } = createRecordingSchoolClient([listEnvelope([])]);

		await loadCalendarEvents(client, academicYearId, SEED_SCHOOL_ID);

		expect(entityListRequests(requests, 'calendar-events')[0]?.body).toEqual(paged({
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
		}));
	});

	it('loads absences through lesson sessions for the active class set', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'ls-1',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				scheduleId: 'sched-1',
				classSubjectId: 'class-subject-1',
				displayLabel: 'Math',
				startsAt: '2026-06-01T08:00:00.000Z',
				endsAt: '2026-06-01T09:00:00.000Z',
			}]),
			listEnvelope([{
				id: 'att-1',
				studentId: 'student-1',
				lessonSessionId: 'ls-1',
				status: 'absent',
				date: '2026-06-01',
				justificationStatus: 'none',
			}]),
			listEnvelope([{
				id: 'class-subject-1',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				subjectId: 'subject-1',
			}]),
			listEnvelope([]),
		]);

		await loadAbsences(client, [classGroupId]);

		expect(entityListRequests(requests, 'lesson-sessions')[0]?.body).toEqual(paged({
			classGroupId: { $in: [classGroupId] },
		}));
		expect(entityListRequests(requests, 'attendance')[0]?.body).toEqual(paged({
			lessonSessionId: { $in: ['ls-1'] },
			status: 'absent',
		}));
		expect(entityListRequests(requests, 'class-subjects')[0]?.body).toEqual(paged({
			id: { $in: ['class-subject-1'] },
		}));
		expect(entityListRequests(requests, 'subjects')[0]?.body).toEqual(paged({
			id: { $in: ['subject-1'] },
		}));
	});

	it('loads incident involvements and only their active-year students', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'incident-1',
				schoolId: SEED_SCHOOL_ID,
				title: 'Late arrival',
				description: 'Student arrived late',
				date: '2026-06-01',
				kind: 'minor_infraction',
				status: 'open',
				reporterId: 'staff-1',
			}]),
			listEnvelope([{
				id: 'involvement-1',
				incidentId: 'incident-1',
				studentId: 'student-1',
				role: 'subject',
			}]),
			listEnvelope([{
				id: 'student-1',
				schoolId: SEED_SCHOOL_ID,
				firstName: 'Ada',
				lastName: 'Lovelace',
				status: 'active',
			}]),
			listEnvelope([{
				id: 'enrollment-1',
				schoolId: SEED_SCHOOL_ID,
				studentId: 'student-1',
				classGroupId,
				academicYearId,
				status: 'active',
			}]),
		]);

		const data = await loadIncidentRouteData(client, {
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
		});

		expect(data.incidents.map(incident => incident.id)).toEqual(['incident-1']);
		expect(data.students.map(student => student.id)).toEqual(['student-1']);
		expect(entityListRequests(requests, 'incidents')[0]?.body).toEqual(paged({
			schoolId: SEED_SCHOOL_ID,
		}));
		expect(entityListRequests(requests, 'student-incident-involvements')[0]?.body).toEqual(paged({
			incidentId: { $in: ['incident-1'] },
		}));
		expect(entityListRequests(requests, 'students')[0]?.body).toEqual(paged({
			id: { $in: ['student-1'] },
		}));
		expect(entityListRequests(requests, 'enrollments')[0]?.body).toEqual(paged({
			studentId: { $in: ['student-1'] },
			academicYearId,
			status: 'active',
		}));
	});
});
