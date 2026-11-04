import type { Page, Route } from 'playwright';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chooseOption } from './custom-select';

/** Run the production school/class drawers against isolated report fixtures. */
export async function checkStudentReportCards(page: Page, origin: string, output: string) {
 const periods = [
  { id: 'term1', name: 'Term 1', startDate: '2026-09-01', endDate: '2026-12-31' },
  { id: 'term2', name: 'Term 2', startDate: '2027-01-01', endDate: '2027-06-30' },
  { id: 'annual1', name: 'Annual 2026–2027', startDate: '2026-09-01', endDate: '2027-06-30' },
  { id: 'annual2', name: 'Annual alternative', startDate: '2026-09-01', endDate: '2027-06-30' },
 ].map(period => ({ ...period, schoolId: 'school', academicYearId: 'year', type: 'other', isPublished: true }));
 const grading = { policyRevision: 1, scaleId: 'scale', scaleRevision: 1, mode: 'numeric-first', maximum: 20, decimalPlaces: 2, roundingMode: 'nearest', units: 'numeric', value: 14.75, reportedValue: 14.75, mention: { id: 'good', code: 'B', label: 'Good progress and strong understanding of the subject' }, provenance: 'numeric-normalization' };
 const makeReport = (periodId: string, annual = false): any => ({
  id: `result-${periodId}`, studentId: 'child', academicYearId: 'year', periodId, classGroupId: 'class', gradeLevelId: 'level', reportConfigurationRevision: 1, gradingPolicyRevision: 1, version: 2,
  sourceMarks: [], sourceAssessments: [], pendingAssessmentIds: [], pendingCorrectionIds: [], calculationStale: false,
  status: annual ? 'published' : 'draft', generatedAt: '2026-10-01T10:00:00Z', publishedAt: annual ? '2026-10-03T10:00:00Z' : null,
  overallAverage: annual ? 16.25 : 14.75, grading: { ...grading, reportedValue: annual ? 16.25 : 14.75 }, rank: 3, classSize: 28,
  sectionResults: [{ sectionId: 'science', name: 'Sciences expérimentales', sectionKind: 'module', rank: 3, participantCount: 28, weight: 5, weightingMode: 'subject_coefficients', average: 14.75, grading,
   subResults: [{ sectionId: 'math', classSubjectId: 'math-class', subjectId: 'math', name: 'Mathematics', sectionKind: 'subject', rank: 2, participantCount: 18, comment: 'Keep practising', average: 14.75, coefficient: 3, weight: 3, grading }, { sectionId: 'physics', classSubjectId: 'physics-class', subjectId: 'physics', name: 'Physics', sectionKind: 'subject', grading: { ...grading, mode: 'mention-first', reportedValue: 12 }, average: 12, coefficient: 2, weight: 2, comment: 'Untouched feedback', subResults: [] }] }],
  teacherComment: 'Recorded comment', attendanceSummary: { presentCount: 10, absenceCount: 0, lateCount: 0, excusedAbsenceCount: 0, total: 10, attendanceRate: 100 }, assessmentResultCount: 10,
  ...(annual ? { aggregation: { source: 'report_cards', sourcePeriodIds: ['term2'], periodWeightsByPeriodId: { term2: 1 }, sourceReportVersions: [{ periodId: 'term2', resultId: 'result-term2', version: 2, sourceVersion: 'captured' }] } } : {}),
 });
 const initialReports = () => [makeReport('term1'), makeReport('annual1', true), { ...makeReport('term2'), status: 'published', publishedAt: '2026-10-02' }];
 let reports = initialReports();
 let read = true; let writes = true; let fail = 0; let denied = false; let hold = false; let failSave = false;
 let release: (() => void) | undefined;
 const requests: { path: string; body: any }[] = [];
 const handler = async (route: Route) => {
  const path = new URL(route.request().url()).pathname;
  const body = route.request().postData() ? route.request().postDataJSON() : {};
  let data: any;
  if (path.endsWith('/effective-grants')) {
   const permissions = ['STUDENT_READ', 'ENROLLMENT_READ', 'STAFF_READ', 'DOCUMENT_READ', ...(read ? ['REPORT_CARD_READ'] : []), ...(writes ? ['REPORT_CARD_GENERATE', 'REPORT_CARD_PUBLISH', 'REPORT_CARD_EXPORT', 'REPORT_CARD_REVIEW_COMMENTS'] : [])];
   data = { kind: 'staff', actorId: 'secretary', schoolId: 'school', grants: permissions.map(permission => ({ permission, scopes: [{ kind: 'school' }] })) };
  } else if (path.endsWith('/academic-periods/list')) data = periods;
  else if (path.endsWith('/results/list')) {
   requests.push({ path, body });
   if (denied || fail) { if (fail) fail--; return route.fulfill({ status: denied ? 403 : 503, json: { message: 'Report read unavailable' } }); }
   const snapshot = structuredClone(reports.filter(report => report.studentId === body.studentId));
   if (hold && body.studentId === 'child') { hold = false; await new Promise<void>(resolve => release = resolve); }
   data = snapshot;
  } else if (path.endsWith('/class-subjects/list')) data = [];
  else if (path.endsWith('/generate-report-card-result')) {
   requests.push({ path, body });
   if (failSave) return route.fulfill({ status: 503, json: { message: 'Generation failed' } });
   const old = reports.find(report => report.periodId === body.periodId);
   data = { ...makeReport(body.periodId, Boolean(body.aggregation)), id: body.id, status: 'draft', publishedAt: null, generatedAt: body.generatedAt, version: (old?.version ?? 0) + 1, aggregation: body.aggregation ? { ...body.aggregation, sourceReportVersions: body.aggregation.sourcePeriodIds.map((id: string) => ({ periodId: id, resultId: `result-${id}`, version: reports.find(report => report.periodId === id)?.version, sourceVersion: 'captured' })) } : undefined };
   if (old?.status === 'published') data = { ...old, revisedDraft: data };
   reports = [...reports.filter(report => report.periodId !== body.periodId), data];
  } else if (path.endsWith('/write-report-card-section-comments')) {
   requests.push({ path, body });
   const report = reports.find(report => report.id === body.id)!;
   if (failSave || report.version !== body.expectedVersion) return route.fulfill({ status: 409, json: { message: 'Report changed' } });
   const patch = (sections: any[]) => sections.forEach(section => { const update = body.sections.find((entry: any) => entry.sectionId === section.sectionId); if (update) section.comment = update.comment; patch(section.subResults ?? []); });
   patch(report.sectionResults); report.version++; data = report;
  } else if (path.endsWith('/publish-report-card-result')) {
   requests.push({ path, body });
   const report = reports.find(report => report.id === body.id)!;
   Object.assign(report, report.revisedDraft ?? {}, { revisedDraft: undefined, status: 'published', publishedAt: body.publishedAt }); data = report;
  } else if (path.endsWith('/get-document-issuance')) data = { id: 'report-document', status: 'ready', ...requests.findLast(request => request.path.endsWith('/request-document-issuance'))?.body };
  else if (path.endsWith('/grant-document-download')) data = { downloadUrl: 'http://localhost:9999/core/files/report-test/content', fileName: 'report.pdf' };
  else if (path.endsWith('/core/files/report-test/content')) return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' });
  else if (path.endsWith('/request-document-issuance')) {
   requests.push({ path, body }); data = { id: 'report-document', ...body, status: 'requested' };
  } else return route.fallback();
  return route.fulfill({ json: data });
 };
 await page.route('http://localhost:9999/**', handler);
 const panel = page.getByTestId('student-report-card');
 const status = page.getByTestId('report-status');
 const menu = () => page.getByTestId('report-actions').getByRole('button');
 const labels = { en: { annual: 'Annual result', generated: 'Generated', published: 'Published', regenerate: 'Regenerate', publish: 'Publish', generate: 'Generate', pdf: 'Generate PDF', empty: 'No annual result for this school year.', missing: 'Date not provided', retry: 'Try again' }, fr: { annual: 'Résultat annuel', generated: 'Généré', published: 'Publié', regenerate: 'Régénérer', publish: 'Publier', generate: 'Générer', pdf: 'Générer le PDF', empty: 'Aucun résultat annuel pour cette année scolaire.', missing: 'Date non renseignée', retry: 'Réessayer' } };
 try {
  for (const locale of ['en', 'fr'] as const) {
   await page.goto(origin);
   await page.evaluate(value => localStorage.setItem('lang', value), locale);
   for (const prefix of ['/school/students/child', '/classes/class/students/child']) {
    console.log(`Checking ${locale} report cards in ${prefix}`);
    const text = labels[locale]; reports = initialReports(); writes = true; read = true; denied = false;
    const url = `${origin}${prefix}/report-card?reportPeriod=term1&q=preserved`;
    await page.goto(url); await status.getByText(text.generated, { exact: true }).waitFor();
    assert.equal(await page.getByTestId('report-summary').locator(':scope > div').count(), 3);
    await panel.getByRole('heading', { name: /Sciences expérimentales/ }).waitFor();
    assert.match(await panel.getByTestId('report-module-summary').innerText(), /Coefficient: 5/);
    assert.match(await panel.getByTestId('report-module-summary').innerText(), /3 \/ 28/);
    assert.match(await panel.getByTestId('report-subject').first().innerText(), /2 \/ 18/);
    assert.match(await panel.getByTestId('report-subject').first().innerText(), /Teacher: Keep practising|Enseignant: Keep practising/);
    assert.equal(await panel.getByText(/Some grades or ranking details|Certaines notes ou/).count(), 0);
    const subject = panel.getByTestId('report-subject').first();
    await subject.getByRole('button').click();
    await page.getByRole('menuitem', { name: locale === 'en' ? 'Edit comment' : 'Modifier le commentaire', exact: true }).click();
    const commentForm = page.getByTestId('form-modal');
    await commentForm.getByRole('textbox').fill('Updated subject feedback');
    failSave = true; await commentForm.getByRole('button', { name: locale === 'en' ? 'Save changes' : 'Enregistrer', exact: true }).click();
    await commentForm.getByRole('alert').waitFor(); assert.equal(await commentForm.getByRole('textbox').inputValue(), 'Updated subject feedback');
    failSave = false; await commentForm.getByRole('button', { name: locale === 'en' ? 'Save changes' : 'Enregistrer', exact: true }).click();
    await commentForm.waitFor({ state: 'hidden' }); await subject.getByText(/Updated subject feedback/).waitFor();
    await page.waitForFunction(() => document.getElementById('report-subject-math')?.querySelector('button') === document.activeElement);
    assert.equal(reports.find(report => report.periodId === 'term1').sectionResults[0].subResults[1].comment, 'Untouched feedback');
    assert.equal(requests.findLast(request => request.path.endsWith('/write-report-card-section-comments'))?.body.sections.length, 1);
    assert.equal(requests.findLast(request => request.path.endsWith('/write-report-card-section-comments'))?.body.sections[0].sectionId, 'math');
    // A direct subject dialog addresses just this section and supports clearing it.
    await page.goto(`${url}&modal=report-comments&modalTarget=math`);
    await commentForm.getByRole('textbox').fill('');
    await commentForm.getByRole('button', { name: locale === 'en' ? 'Save changes' : 'Enregistrer', exact: true }).click();
    await commentForm.waitFor({ state: 'hidden' });
    assert.equal(requests.findLast(request => request.path.endsWith('/write-report-card-section-comments'))?.body.sections[0].comment, null);
    await subject.getByRole('button').press('Enter');
    await page.getByRole('menuitem', { name: locale === 'en' ? 'Add comment' : 'Ajouter un commentaire', exact: true }).click();
    await commentForm.getByRole('textbox').waitFor();
    await page.goBack(); await commentForm.waitFor({ state: 'hidden' });
    await page.goForward(); await commentForm.getByRole('textbox').waitFor();
    await page.keyboard.press('Escape'); await commentForm.waitFor({ state: 'hidden' });
    reports = initialReports(); await page.goto(url); await status.waitFor();
    const date = new Date('2026-10-01T12:00:00').toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    await status.getByText(date, { exact: true }).waitFor();
    const titleStyle = await panel.getByRole('heading', { name: /Sciences expérimentales/ }).evaluate(el => ({ size: getComputedStyle(el).fontSize, weight: getComputedStyle(el).fontWeight, gap: getComputedStyle(el.parentElement!).gap }));
    assert.deepEqual(titleStyle, { size: '20px', weight: '600', gap: '16px' });
    const pickerBox = await page.getByTestId('report-period-trigger').boundingBox(); const actionBox = await menu().boundingBox();
    assert(pickerBox && actionBox && actionBox.x > pickerBox.x && Math.abs(actionBox.y - pickerBox.y) < 8);
    await menu().press('Enter'); await page.getByRole('menuitem', { name: text.regenerate, exact: true }).waitFor();
    await page.keyboard.press('Escape'); assert(await menu().evaluate(el => document.activeElement === el));
    await page.getByTestId('report-period-trigger').click(); await page.getByRole('option', { name: text.annual, exact: true }).click();
    await status.getByText(text.published, { exact: true }).waitFor();
    await panel.getByText('16.25 / 20', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('q'), 'preserved');
    await page.goBack(); await status.getByText(text.generated, { exact: true }).waitFor();
    await page.goForward(); await status.getByText(text.published, { exact: true }).waitFor();
    await menu().click(); await Promise.all([page.waitForResponse(response => response.url().endsWith('/request-document-issuance')), page.getByRole('menuitem', { name: text.pdf, exact: true }).click()]);
    assert.equal(requests.findLast(request => request.path.endsWith('/request-document-issuance'))?.body.templateKey, 'annual-report-card.v1');
    await menu().click(); await page.getByRole('menuitem', { name: text.regenerate, exact: true }).click();
    await page.getByTestId('form-modal').waitFor();
    assert.match(await page.getByTestId('form-modal').locator('button[aria-haspopup="listbox"]').first().innerText(), /Annual 2026/);
    const revisionForm = page.getByTestId('form-modal');
    await revisionForm.getByRole('button', { name: locale === 'en' ? 'Calculate annual results' : 'Calculer les résultats annuels', exact: true }).click();
    await revisionForm.getByRole('button', { name: text.publish, exact: true }).waitFor();
    assert(await status.getByText(text.published, { exact: true }).isVisible(), 'Published annual results remain visible during revision');
    await revisionForm.getByRole('button', { name: text.publish, exact: true }).click();
    await revisionForm.getByRole('button', { name: text.publish, exact: true }).waitFor({ state: 'hidden' });
    assert.equal(requests.findLast(request => request.path.endsWith('/publish-report-card-result'))?.body.reviewedDraftVersion, 3);
    await revisionForm.getByRole('button', { name: locale === 'en' ? 'Close' : 'Fermer', exact: true }).last().click();
    await page.getByTestId('form-modal').waitFor({ state: 'hidden' });
    await page.waitForURL(url => !url.searchParams.has('modal'));
    assert.equal(new URL(page.url()).searchParams.get('reportPeriod'), 'annual');
    await page.goto(url);
    await menu().click(); await page.getByRole('menuitem', { name: text.publish, exact: true }).click();
    await status.getByText(text.published, { exact: true }).waitFor();
    const publication = requests.findLast(request => request.path.endsWith('/publish-report-card-result'))!.body;
    assert.equal(publication.reviewedDraftVersion, 2); assert.equal(publication.reviewedGradingRevision, 1);
    await menu().click(); await page.getByRole('menuitem', { name: text.pdf, exact: true }).click();
    await page.waitForTimeout(150);
    assert.equal(requests.findLast(request => request.path.endsWith('/request-document-issuance'))?.body.templateKey, 'report-card.v1');
    await menu().click(); await page.getByRole('menuitem', { name: text.regenerate, exact: true }).click();
    await status.getByText(text.published, { exact: true }).waitFor();
    await menu().click();
    await page.getByRole('menuitem', { name: locale === 'en' ? 'Review draft' : 'Examiner le brouillon', exact: true }).click();
    await status.getByText(text.generated, { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('reportVersion'), 'draft');
    assert.equal(requests.findLast(request => request.path.endsWith('/generate-report-card-result'))?.body.id, 'result-term1');
    await menu().click(); await page.getByRole('menuitem', { name: text.publish, exact: true }).click();
    await status.getByText(text.published, { exact: true }).waitFor();
    assert.equal(requests.findLast(request => request.path.endsWith('/publish-report-card-result'))?.body.reviewedDraftVersion, 3);
    // Missing saved values are local placeholders; the old generic notice is absent.
    Object.assign(reports.find(report => report.periodId === 'term1'), { status: 'draft', generatedAt: null, grading: undefined, overallAverage: undefined, rank: undefined });
    await page.reload(); await status.getByText(text.missing, { exact: true }).waitFor();
    assert.equal(await panel.getByText('—', { exact: true }).count(), 2);
    assert.equal(await panel.getByTestId('report-card-availability-notice').count(), 0);
    reports.find(report => report.periodId === 'term1').pendingCorrectionIds = ['correction']; await page.reload(); await menu().click();
    assert(await page.getByRole('menuitem', { name: text.publish, exact: true }).isDisabled()); await page.keyboard.press('Escape');
    reports = [{ ...makeReport('term1'), status: 'published', publishedAt: '2026-10-02' }]; await page.goto(`${origin}${prefix}/report-card?reportPeriod=annual`);
    await panel.getByText(text.empty, { exact: true }).waitFor(); await menu().click();
    await page.getByRole('menuitem', { name: text.generate, exact: true }).click();
    const form = page.getByTestId('form-modal'); await form.waitFor();
    await form.locator('button[aria-haspopup="listbox"]').first().click();
    await page.getByRole('option').filter({ hasText: 'Annual 2026–2027' }).click();
    await form.locator('[id="annual-source-term1"]').click();
    const calculate = form.getByRole('button', { name: locale === 'en' ? 'Calculate annual results' : 'Calculer les résultats annuels', exact: true });
    failSave = true; await calculate.click(); await page.waitForTimeout(250);
    assert(await form.isVisible()); assert(await form.locator('[id="annual-source-term1"]').isChecked());
    failSave = false; await calculate.click();
    await form.getByRole('button', { name: text.publish, exact: true }).waitFor();
    await form.getByRole('button', { name: text.publish, exact: true }).click();
    await form.getByRole('button', { name: text.pdf, exact: true }).waitFor();
    await form.getByRole('button', { name: locale === 'en' ? 'Close' : 'Fermer', exact: true }).last().click();
    await form.waitFor({ state: 'hidden' });
    await page.waitForURL(url => !url.searchParams.has('modal'));
    await status.getByText(text.published, { exact: true }).waitFor();
    assert.equal(requests.findLast(request => request.path.endsWith('/generate-report-card-result'))?.body.aggregation.source, 'report_cards');
    reports = [makeReport('term1'), makeReport('annual1', true), makeReport('annual2', true)];
    await page.reload(); await page.getByTestId('report-annual-target').waitFor();
    assert.equal(await status.count(), 0);
    await page.getByTestId('report-annual-target').click(); await page.getByRole('option').filter({ hasText: 'Annual alternative' }).click(); await status.waitFor();
    assert.equal(new URL(page.url()).searchParams.get('annualTarget'), 'annual2');
    writes = false; await page.reload(); await status.waitFor(); assert.equal(await menu().count(), 0); assert.equal(await panel.getByTestId('report-subject').getByRole('button').count(), 0);
    read = false; await page.reload(); await page.getByTestId('student-drawer-body').getByText(locale === 'en' ? 'Access denied' : 'Accès refusé', { exact: true }).first().waitFor();
    assert.equal(await panel.count(), 0);
    read = true; denied = true; await page.reload(); await page.getByTestId('student-drawer-body').getByText(locale === 'en' ? 'Access denied' : 'Accès refusé', { exact: true }).first().waitFor(); assert.equal(await panel.count(), 0); denied = false;
    fail = 100; await page.reload(); await page.getByRole('button', { name: text.retry, exact: true }).last().waitFor(); fail = 0; await page.getByRole('button', { name: text.retry, exact: true }).last().click(); await status.waitFor();
    writes = true; await page.reload(); await status.waitFor();
    for (const width of [1440, 390]) for (const scale of [1, 2]) {
     await page.setViewportSize({ width, height: 1000 }); await page.evaluate(scale => document.documentElement.style.fontSize = `${16 * scale}px`, scale);
     await panel.scrollIntoViewIfNeeded();
     assert(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
     await page.getByTestId('report-period-trigger').press('Enter'); await page.keyboard.press('End'); await page.keyboard.press('Escape'); await page.getByRole('option').first().waitFor({ state: 'hidden' });
     await panel.screenshot({ path: resolve(output, `report-${locale}-${prefix.startsWith('/school') ? 'school' : 'class'}-${width}-${scale}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.evaluate(() => document.documentElement.style.fontSize = '');
    // A delayed first student's result must not overwrite the next drawer.
    hold = true; await page.goto(url);
    for (let attempt = 0; !release && attempt < 100; attempt++) await page.waitForTimeout(25);
    assert(release, 'The first student read is still pending');
    await page.goto(`${origin}${prefix.replace('/child', '/child2')}/report-card?reportPeriod=term1`);
    release?.(); release = undefined;
    await panel.waitFor(); assert.equal(await status.count(), 0); assert.equal(await panel.getByText('Recorded comment').count(), 0);
    await page.goto(url); await status.waitFor();
    await page.keyboard.press('Escape'); await panel.waitFor({ state: 'hidden' });
    await page.getByTestId('academic-year-trigger').click();
    await chooseOption(page.getByTestId('academic-year-choice'), 'old-year');
    await page.getByTestId('academic-year-apply').click();
    await page.locator('[data-testid=academic-year-trigger][data-year-id=old-year]').waitFor();
    await page.goto(url); await panel.waitFor(); assert.equal(await status.count(), 0);
    await page.keyboard.press('Escape'); await panel.waitFor({ state: 'hidden' });
    await page.getByTestId('academic-year-trigger').click();
    await chooseOption(page.getByTestId('academic-year-choice'), 'year');
    await page.getByTestId('academic-year-apply').click();
    await page.locator('[data-testid=academic-year-trigger][data-year-id=year]').waitFor();
    await page.goto(url); await status.waitFor();
   }
  }
  console.log('PASS: report-card period/annual layout, menus, permissions, failures, stale reads and EN/FR responsive drawers');
 } finally {
  release?.(); await page.unroute('http://localhost:9999/**', handler);
  await page.evaluate(() => { localStorage.setItem('lang', 'en'); document.documentElement.style.fontSize = ''; });
  await page.setViewportSize({ width: 1440, height: 1000 });
 }
}
