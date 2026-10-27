import type { UiJourney } from './journey-context';
import assert from 'node:assert/strict';
import { apiFetch } from './journey-api';

/** Explicit persisted prerequisites for behavior reads; never credits a UI scenario. */
export async function createRequiredReadFixtures(journey: UiJourney): Promise<void> {
	const { page, base } = journey.ctx;
	const { activityId, classId, studentId, teachingId, subjectId } = journey.entities;
	assert(activityId && classId && studentId && teachingId && subjectId, 'Required activity/curriculum fixture dependencies missing');
	const post = async (path: string, data: Record<string, unknown>) => {
		const response = await apiFetch(page, base, `/core/${path}`, { method: 'POST', data });
		assert(response.ok(), `Required ${path} fixture HTTP ${response.status()}`);
	};
	await post('entities/class-activity-enrollments/save', { id: crypto.randomUUID(), activityId, classGroupId: classId, createdAt: new Date().toISOString() });
	await post('commands/enroll-student-in-activity', { id: crypto.randomUUID(), activityId, studentId, status: 'approved' });
	const subjectsResponse = await apiFetch(page, base, '/core/entities/class-subjects/list', { method: 'POST', data: { classGroupId: classId } });
	assert(subjectsResponse.ok(), 'Required class-subject query failed');
	const subjects = await subjectsResponse.json() as Array<{ id: string; subjectId: string }>;
	assert(subjects.length > 0, 'Required assigned curriculum missing');
	const teaching = subjects.find(subject => subject.subjectId === subjectId);
	assert(teaching, 'Required fixture subject is not assigned to the class');
	journey.entities.teachingId = teaching.id;
	journey.entities.configurationSubjectId = teaching.subjectId;
	for (const subject of subjects) {
		await post('commands/update-subject', { subjectId: subject.subjectId, coefficient: 1 });
		const subjectMatterId = crypto.randomUUID();
		await post('commands/configure-subject-matter', { id: subjectMatterId, subjectId: subject.subjectId, name: `Integration curriculum ${subjectMatterId}`, sequenceOrder: 2 });
	}
	const classResponse = await apiFetch(page, base, `/core/entities/class-groups/${classId}`);
	assert(classResponse.ok());
	const classroom = await classResponse.json() as Record<string, unknown>;
	await post('commands/create-class-group', { ...classroom, id: crypto.randomUUID(), name: 'Integration contrasting class', homeroomStaffId: null });
	const gradeResponse = await apiFetch(page, base, `/core/entities/grade-levels/${journey.entities.gradeLevelId}`);
	assert(gradeResponse.ok(), 'Required grade-level fixture missing');
	const grade = await gradeResponse.json() as Record<string, unknown>;
	const contrastLevelId = crypto.randomUUID();
	await post('commands/configure-grade-level', { ...grade, id: contrastLevelId, name: `Integration filter level ${contrastLevelId}` });
	const offerResponse = await apiFetch(page, base, `/core/entities/subjects/${teaching.subjectId}`);
	assert(offerResponse.ok(), 'Required subject missing');
	const offer = await offerResponse.json() as Record<string, unknown>;
	await post('commands/configure-subject', { ...offer, reportModuleId: null, id: crypto.randomUUID(), gradeLevelId: contrastLevelId });
	journey.steps.push({ step: 'activity-and-curriculum-fixtures', ok: true });
}
