import { chooseOption } from './custom-select';
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
  await waitForResolvedAcademicYearId(page);
  const year = await page.getByTestId('academic-year-trigger').getAttribute('data-year-id');
  assert(year, 'Import fixture requires a selected academic year');
  const schoolId = await resolveSchoolId(page, base);
  assert(schoolId, 'Import fixture requires a school');
  async function request(path: string, data?: Row) {
    const response = await apiFetch(page, base, path, { ...(data ? { method: 'POST', data } : {}), academicYearId: year! });
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
  const klass = await get('class-groups', entities.classId);
  const level = await get('grade-levels', String(klass.gradeLevelId));
  let csv: Row;
  let collection = '';
  let expectedCreated = '1';
  let matches: (row: Row) => boolean = () => false;
  if (type === 'students') {
    csv = { prenom: 'Integration', nom: unique, classe: klass.name, matricule: unique, enrollment_effective_date: effectiveDate };
    collection = 'students'; matches = row => row.matricule === unique;
  } else if (type === 'classes') {
    csv = { nom: unique, niveau: level.name, capacite: '30' };
    collection = 'class-groups'; matches = row => row.name === unique;
  } else if (type === 'academic_disciplines' || type === 'placement_statuses') {
    csv = { code: unique, [type === 'academic_disciplines' ? 'name' : 'label']: unique, is_active: true };
    collection = type === 'academic_disciplines' ? 'academic-disciplines' : 'placement-statuses'; matches = row => String(row.code).toLowerCase() === unique.toLowerCase();
  } else if (type === 'class_offerings') {
    const teaching = await get('class-subjects', entities.teachingId);
    csv = { classe: klass.id, subject_id: teaching.subjectId, is_offered: !teaching.isOffered };
    collection = 'class-subjects'; matches = row => row.id === teaching.id && row.isOffered === !teaching.isOffered;
    expectedCreated = '0';
  } else if (type === 'subjects') {
    const disciplineId = crypto.randomUUID();
    await request('/core/commands/configure-academic-discipline', { id: disciplineId, schoolId, code: unique, name: unique, isActive: true });
    const category = (await list('subject-categories'))[0];
    assert(category, 'Subject import requires a persisted category');
    csv = { nom: unique, niveau: level.id, abbreviation: unique, coefficient: '2', discipline_code: unique, category: category.id };
    collection = 'subjects'; matches = row => row.name === unique;
  } else if (type === 'staff' || type === 'teachers') {
    csv = { code: unique, prenom: 'Integration', nom: unique, email: `${unique}@integration.edaya.test`, ...(type === 'staff' ? { role: 'Secrétaire', phone: '00000123' } : {}) };
    collection = type === 'staff' ? 'staff-members' : 'teachers'; matches = row => row.code === unique && (type !== 'staff' || row.phone === '00000123');
  } else if (type === 'teacher_assignments') {
    const teacherId = crypto.randomUUID();
    await request('/core/commands/register-teacher', { id: teacherId, schoolId, code: unique, firstName: 'Integration', lastName: unique, email: null, phone: null, subjectId: null, isActive: true });
    const teaching = await get('class-subjects', entities.teachingId);
    const subject = await get('subjects', String(teaching.subjectId));
    csv = { code: unique, classe: klass.name, subject_id: subject.id };
    collection = 'teacher-assignments'; matches = row => row.teacherId === teacherId && row.classSubjectId === teaching.id;
  } else if (type === 'chapters') {
    const subject = (await list('subjects', { gradeLevelId: level.id, academicYearId: year }))[0];
    assert(subject, 'Required subject fixture missing for the selected grade and academic year');
    const chapters = await list('subject-matters', { subjectId: subject.id });
    csv = { niveau: level.id, subject_id: subject.id, titre: unique, sequence: Math.max(0, ...chapters.map(row => Number(row.sequenceOrder ?? 0))) + 1, description: 'Integration chapter' };
    collection = 'subject-matters'; matches = row => row.name === unique;
  } else {
    // A new student per scenario avoids mutating the baseline or depending on another import.
    const studentId = crypto.randomUUID();
    await request('/core/commands/register-student', { id: studentId, schoolId, firstName: 'Integration', lastName: unique, sendAccountInvitation: false, createdAt: new Date().toISOString() });
    await request('/core/commands/update-student-profile', { studentId, firstName: 'Integration', lastName: unique, matricule: unique });
    await request('/core/commands/enroll-student', { id: crypto.randomUUID(), studentId, classGroupId: klass.id, enrolledAt: effectiveDate, createdAt: new Date().toISOString() });
    if (type === 'guardians') {
      csv = { code: unique, prenom: 'Integration', nom: unique, eleve_matricule: unique, email: `${unique}@integration.edaya.test` };
      collection = 'guardians'; matches = row => row.code === unique;
    } else if (type === 'guardian_relationships') {
      const guardianId = crypto.randomUUID();
      await request('/core/commands/register-guardian', { id: guardianId, schoolId, code: unique, firstName: 'Integration', lastName: unique, sendAccountInvitation: false });
      csv = { guardian: unique, student: unique, legal_guardian: false, can_pickup: true, notes: 'Per-child rights' };
      collection = 'guardian-links'; matches = row => row.guardianId === guardianId && row.studentId === studentId && row.legalGuardian === false;
    } else if (type === 'billing') {
      const fee = (await list('catalog-services'))[0];
      assert(fee, 'Required catalog service fixture missing');
      csv = { matricule: unique, type_frais: fee.name, montant: '1000' };
      collection = 'student-service-enrollments'; matches = row => row.studentId === studentId && row.catalogServiceId === fee.id;
    } else {
      csv = { matricule: unique, reference: unique, montant: '1000', mode: 'espèces', date: new Date().toISOString().slice(0, 10) };
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
      assert.equal(template.suggestedFilename(), 'students-v1.xlsx');
      assert.equal(await template.failure(), null);
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
  return `${type}: invalid row rejected; one valid row imported and read back after reload`;
}
