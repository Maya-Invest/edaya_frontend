import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import type { MatrixEntities } from '../../../scripts/qa-matrix-support';
import { apiFetch } from '../setup/journey-api';
import { navigateSpaPage, waitForPageQuery } from '../../../scripts/qa-harness-ui';

export async function exerciseTeacherRead(page: Page, base: string, action: string, entities: MatrixEntities) {
  if (action === 'Emploi du temps') {
    const [response] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/queries/get-teacher-timetable') && response.request().method() === 'POST'),
      page.reload({ waitUntil: 'domcontentloaded' }),
    ]);
    assert(response.ok(), `Teacher timetable HTTP ${response.status()}`);
    const data = await response.json() as { events: Array<{ id: string; title: string; classGroupId: string; lessonSessionId?: string; assessmentId?: string }> };
    assert(data.events.length > 0, 'Required published teacher timetable fixture missing');
    const event = data.events[0]!;
    await page.getByRole('complementary', { name: /enseignant|teacher/i }).getByRole('link').filter({ hasText: event.title }).first().waitFor();
    const initialRange = response.request().postDataJSON() as { startDate: string; endDate: string };
    const [next] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/queries/get-teacher-timetable') && response.request().method() === 'POST'),
      page.getByRole('button', { name: /semaine suivante|next week/i }).click(),
    ]);
    assert(next.ok());
    assert.notEqual((next.request().postDataJSON() as { startDate: string }).startDate, initialRange.startDate);
    return 'Rendered a published teacher session and changed the requested week through the timetable controls';
  }
  if (action === 'Évaluations') {
    assert(entities.evaluationId, 'Required assessment fixture missing');
    const response = await apiFetch(page, base, `/core/entities/assessments/${entities.evaluationId}`);
    assert(response.ok());
    const assessment = await response.json() as { title: string; classGroupId: string };
    const link = page.locator(`a[href*="/evaluations/${entities.evaluationId}/"]`);
    await link.waitFor({ state: 'visible' });
    assert((await link.innerText()).includes(assessment.title));
    await link.click();
    await page.waitForURL(url => url.pathname.includes(`/classes/${assessment.classGroupId}/evaluations/${entities.evaluationId}/`));
    return 'Rendered the assigned assessment and opened its class-scoped details';
  }
  assert(entities.familyFeedbackCampaignId, 'Required feedback campaign fixture missing');
  const response = await apiFetch(page, base, '/core/queries/get-family-feedback-campaign', { method: 'POST', data: { id: entities.familyFeedbackCampaignId } });
  assert(response.ok());
  const campaign = await response.json() as { teacherId: string };
  assert(campaign.teacherId, 'Feedback fixture must identify its teacher');
  await navigateSpaPage(page, `${base}/school/teachers/${campaign.teacherId}/family-feedback`);
  await waitForPageQuery(page);
  const link = page.locator(`a[href*="/school/family-feedback/${entities.familyFeedbackCampaignId}"]`);
  await link.waitFor({ state: 'visible' });
  await link.click();
  await page.waitForURL(url => url.pathname.includes(`/school/family-feedback/${entities.familyFeedbackCampaignId}/`));
  return 'Rendered the teacher-specific campaign and opened its persisted details';
}
