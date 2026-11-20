import { chooseOption, selectControl } from './custom-select';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { apiFetch, resolveSchoolId } from '../setup/journey-api';
import { waitForResolvedAcademicYearId, waitForPageQuery, navigateSpaPage } from '../../../scripts/qa-harness-ui';
import type { MatrixEntities } from '../../../scripts/qa-matrix-support';

type Row = Record<string, unknown>;
export const IMPORT_SCENARIOS = {
  students: 'Import élèves — template, validation, import, rapport',
  guardians: 'Import tuteurs', staff: 'Import personnel', teachers: 'Import enseignants',
  classes: 'Import classes', subjects: 'Import matières', teacher_assignments: 'Import affectations enseignant',
  chapters: 'Import chapitres', billing: 'Import facturation (prérequis: frais créés)',
  payments: 'Import paiements (prérequis: facturation élève)',
  academic_disciplines: 'Import disciplines académiques', placement_statuses: 'Import statuts de placement',
  guardian_relationships: 'Import liens tuteurs-élèves',
  class_offerings: 'Import offres de matières',
} as const;

export async function exerciseImport(page: Page, base: string, type: keyof typeof IMPORT_SCENARIOS, entities: MatrixEntities) {
  const year = await waitForResolvedAcademicYearId(page);
  const schoolId = await resolveSchoolId(page, base);
  assert(schoolId, 'Import fixture requires a school');
  async function request(path: string, data?: Row) {
    const response = await apiFetch(page, base, path, { ...(data ? { method: 'POST', data } : {}), schoolId: schoolId!, academicYearId: year, headers: { 'x-actor-kind': 'staff' } });
    assert(response.ok(), `Import fixture/read ${path}: HTTP ${response.status()} ${await response.text()}`);
    return response.json();
  }
  async function list(entity: string, filters: Row = {}): Promise<Row[]> {
    const rows: Row[] = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
      const data = await request(`/core/entities/${entity}/list`, {
        schoolId, ...filters, $limit: pageSize, $offset: offset,
        $orderBy: [{ field: 'id', direction: 'asc' }],
      });
      const pageRows: Row[] = Array.isArray(data) ? data : (data as { items: Row[] }).items;
      rows.push(...pageRows);
      if (pageRows.length < pageSize) return rows;
    }
  }
  async function get(entity: string, id: string | null | undefined): Promise<Row> {
    assert(id, `Required ${entity} fixture ID missing`);
    const body = await request(`/core/entities/${entity}/${id}`) as Row;
    return (body.data ?? body) as Row;
  }
  const academicYear = await get('academic-years', year);
  const effectiveDate = String(academicYear.startDate).slice(0, 10);
  const unique = `Import-${type}-${crypto.randomUUID().slice(0, 8)}`;
  const identifier = `QA-${crypto.randomUUID().slice(0, 12)}`.toUpperCase();
  async function createHuman(_group: 'students' | 'teachers' | 'guardians', command: string) {
    const id = crypto.randomUUID();
    await request(`/core/commands/${command}`, { id, schoolId, requestId: id, identifier, firstName: 'Integration', lastName: unique, sendAccountInvitation: false });
    return id;
  }
  const klass = await get('class-groups', entities.classId);
  const level = await get('grade-levels', String(klass.gradeLevelId));
  let csv: Row;
  let selectedClassId: string | undefined;
  let collection = '';
  let expectedCreated = '1';
  let matches: (row: Row) => boolean = () => false;
  if (type === 'students') {
    selectedClassId = crypto.randomUUID();
    for (const [id, shortName] of [[selectedClassId, 'Left'], [crypto.randomUUID(), 'Right']]) {
      await request('/core/commands/create-class-group', { id, schoolId, academicYearId: year, gradeLevelId: level.id, name: unique, shortName, capacity: 30 });
    }
    csv = { first_name: 'Integration', last_name: unique, class_name: unique, identifier, enrollment_effective_date: effectiveDate };
    collection = 'students'; matches = row => row.identifier === identifier;
  } else if (type === 'classes') {
    csv = { name: unique, grade_id: level.id, capacity: '30' };
    collection = 'class-groups'; matches = row => row.name === unique;
  } else if (type === 'academic_disciplines' || type === 'placement_statuses') {
    csv = { name: unique, short_name: identifier, is_active: true };
    collection = type === 'academic_disciplines' ? 'academic-disciplines' : 'placement-statuses'; matches = row => row.name === unique;
  } else if (type === 'class_offerings') {
    const teaching = await get('class-subjects', entities.teachingId);
    csv = { target_id: teaching.id, class_id: klass.id, subject_id: teaching.subjectId, is_offered: !teaching.isOffered };
    collection = 'class-subjects'; matches = row => row.id === teaching.id && row.isOffered === !teaching.isOffered;
    expectedCreated = '0';
  } else if (type === 'subjects') {
    const disciplineId = crypto.randomUUID();
    await request('/core/commands/configure-academic-discipline', { id: disciplineId, schoolId, shortName: identifier, name: unique, isActive: true });
    const category = (await list('subject-categories'))[0];
    assert(category, 'Subject import requires a persisted category');
    csv = { name: unique, grade_id: level.id, short_name: identifier, coefficient: '2', discipline_id: disciplineId, category_id: category.id };
    collection = 'subjects'; matches = row => row.name === unique;
  } else if (type === 'staff' || type === 'teachers') {
    csv = { identifier, first_name: 'Integration', last_name: unique, email: `${unique}@integration.edaya.test`, ...(type === 'staff' ? { role: 'Secrétaire', phone: '00000123' } : {}) };
    collection = type === 'staff' ? 'staff-members' : 'teachers'; matches = row => row.identifier === identifier && (type !== 'staff' || row.phone === '00000123');
  } else if (type === 'teacher_assignments') {
    const teacherId = await createHuman('teachers', 'register-teacher');
    const teaching = await get('class-subjects', entities.teachingId);
    const subject = await get('subjects', String(teaching.subjectId));
    csv = { teacher_id: teacherId, class_id: klass.id, subject_id: subject.id };
    collection = 'teacher-assignments'; matches = row => row.teacherId === teacherId && row.classSubjectId === teaching.id;
  } else if (type === 'chapters') {
    const subject = (await list('subjects', { gradeLevelId: level.id, academicYearId: year }))[0];
    assert(subject, 'Required subject fixture missing for the selected grade and academic year');
    const chapters = await list('subject-matters', { subjectId: subject.id });
    csv = { grade_id: level.id, subject_id: subject.id, name: unique, sequence: Math.max(0, ...chapters.map(row => Number(row.sequenceOrder ?? 0))) + 1, description: 'Integration chapter' };
    collection = 'subject-matters'; matches = row => row.name === unique;
  } else {
    // A new student per scenario avoids mutating the baseline or depending on another import.
    const studentId = await createHuman('students', 'register-student');
    await request('/core/commands/enroll-student', { id: crypto.randomUUID(), studentId, classGroupId: klass.id, enrolledAt: effectiveDate, createdAt: new Date().toISOString() });
    if (type === 'guardians') {
      csv = { identifier, first_name: 'Integration', last_name: unique, student_ids: studentId, email: `${unique}@integration.edaya.test` };
      collection = 'guardians'; matches = row => row.identifier === identifier;
    } else if (type === 'guardian_relationships') {
      const guardianId = await createHuman('guardians', 'register-guardian');
      csv = { guardian_id: guardianId, student_id: studentId, legal_guardian: false, can_pickup: true, notes: 'Per-child rights' };
      collection = 'guardian-links'; matches = row => row.guardianId === guardianId && row.studentId === studentId && row.legalGuardian === false;
    } else if (type === 'billing') {
      const fee = (await list('catalog-services'))[0];
      assert(fee, 'Required catalog service fixture missing');
      csv = { student_id: studentId, catalog_service_id: fee.id, amount: '1000' };
      collection = 'student-service-enrollments'; matches = row => row.studentId === studentId && row.catalogServiceId === fee.id;
    } else {
      csv = { student_id: studentId, reference: unique, montant: '1000', mode: 'espèces', date: new Date().toISOString().slice(0, 10) };
      collection = 'payments'; matches = row => row.reference === unique;
    }
  }
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const encode = (row: Row) => `${Object.keys(row).join(',')}\n${Object.values(row).map(quote).join(',')}\n`;
  async function upload(row: Row) {
    await navigateSpaPage(page, `${base}/configuration/tools`);
    await waitForPageQuery(page);
    await page.getByTestId('import-action').click();
    const modal = page.getByTestId('data-import-modal');
    await modal.waitFor({ state: 'visible', timeout: 15000 });
    assert.equal(await page.getByTestId('import-mode').locator('xpath=ancestor-or-self::*[@data-select-field][1]').locator('select[data-select-value]').inputValue(), 'M');
    await page.getByTestId('import-create').click();
    await chooseOption(page.getByTestId('data-import-type-select'), type);
    if (type === 'students') {
      const downloaded = page.waitForEvent('download');
      await page.getByTestId('import-template-xlsx').click();
      const template = await downloaded;
      assert.equal(template.suggestedFilename(), 'students-v2.xlsx');
      assert.equal(await template.failure(), null);
      const exporting = page.waitForEvent('download');
      await modal.getByRole('button', { name: /Export existing records|Exporter les enregistrements existants/i }).click();
      const exported = await exporting;
      assert.match(exported.suggestedFilename(), /students.*\.xlsx$/);
      assert.equal(await exported.failure(), null);
    }
    await page.getByTestId('import-file-input').waitFor({ state: 'visible' });
    await page.getByTestId('import-file-input').setInputFiles({ name: `${type}.csv`, mimeType: 'text/csv', buffer: Buffer.from(encode(row)) });
    const uploaded = page.waitForResponse(response => response.url().includes('/imports/submit') && response.request().method() === 'POST');
    await page.getByTestId('import-upload').click();
    assert((await uploaded).ok());
    await page.getByTestId('task-step-preview').click();
    await page.getByTestId('import-validate').click();
    await page.locator('[data-testid="import-progress"][data-state="validated"]').waitFor({ state: 'visible', timeout: 30000 });
    return modal;
  }
  const invalid = { ...csv, on_existing: 'invalid' };
  await upload(invalid);
  await page.getByTestId('task-step-execution').click();
  assert.equal(await page.getByTestId('import-confirm').isDisabled(), true, `${type}: invalid row must prevent execution`);
  assert(Number(await page.getByTestId('import-progress').getAttribute('data-blocked')) > 0);
  await page.keyboard.press('Escape');
  const modal = await upload(csv);
  if (selectedClassId) {
    assert.equal(await page.getByTestId('import-progress').getAttribute('data-blocked'), '1');
    await modal.getByRole('button', { name: /Review matches|Examiner les correspondances/i }).click();
    await chooseOption(selectControl(modal, { name: /Select a record|Choisir un enregistrement/i }), selectedClassId);
    await modal.getByRole('button', { name: /Use this record|Utiliser cet enregistrement/i }).click();
    await page.locator('[data-testid="import-progress"][data-blocked="0"]').waitFor();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForPageQuery(page);
    await page.locator('[data-testid="import-progress"][data-state="validated"][data-blocked="0"]').waitFor();
    await page.getByTestId('task-step-preview').click();
  }
  assert.equal(await page.getByTestId('import-progress').getAttribute('data-blocked'), '0', `${type}: valid fixture rejected: ${await modal.innerText()}`);
  if (type === 'students') {
    await page.getByTestId('task-step-history').click();
    const downloaded = page.waitForEvent('download');
    await page.getByTestId('import-corrections-xlsx').click();
    const corrections = await downloaded;
    assert.match(corrections.suggestedFilename(), /^corrections-.+\.xlsx$/);
    assert.equal(await corrections.failure(), null);
  }
  await page.getByTestId('task-step-execution').click();
  await page.getByTestId('import-confirm').click();
  await page.locator('[data-testid="import-progress"][data-state="completed"]').waitFor({ state: 'visible', timeout: 60000 });
  assert.equal(await page.getByTestId('import-progress').getAttribute('data-created'), expectedCreated, `${type}: import did not create the row: ${await modal.innerText()}`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  await page.locator('[data-testid="import-progress"][data-state="completed"]').waitFor({ state: 'visible', timeout: 30000 });
  const persisted = (await list(collection)).filter(matches);
  assert.equal(persisted.length, 1, `${type}: exactly one imported record must persist after reload`);
  if (selectedClassId) {
    const enrollments = await list('enrollments', { studentId: persisted[0].id });
    assert.equal(enrollments.length, 1);
    assert.equal(enrollments[0].classGroupId, selectedClassId, 'Execution must use the class selected before refresh');
  }
  return `${type}: invalid row rejected; one valid row imported and read back after reload`;
}
