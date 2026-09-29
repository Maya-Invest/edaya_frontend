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
    const data = await request(`/core/entities/${entity}/list`, { schoolId, ...filters });
    return Array.isArray(data) ? data : (data as { items: Row[] }).items;
  }
  async function get(entity: string, id: string | null | undefined): Promise<Row> {
    assert(id, `Required ${entity} fixture ID missing`);
    const body = await request(`/core/entities/${entity}/${id}`) as Row;
    return (body.data ?? body) as Row;
  }
  const unique = `Import-${type}-${crypto.randomUUID().slice(0, 8)}`;
  const klass = await get('class-groups', entities.classId);
  const level = await get('grade-levels', String(klass.gradeLevelId));
  let csv: Row;
  let collection = '';
  let matches: (row: Row) => boolean = () => false;
  if (type === 'students') {
    csv = { prenom: 'Integration', nom: unique, classe: klass.name, matricule: unique };
    collection = 'students'; matches = row => row.matricule === unique;
  } else if (type === 'classes') {
    csv = { nom: unique, niveau: level.name, capacite: '30' };
    collection = 'class-groups'; matches = row => row.name === unique;
  } else if (type === 'subjects') {
    csv = { nom: unique, niveau: level.name, abbreviation: unique, coefficient: '2' };
    collection = 'subjects'; matches = row => row.name === unique;
  } else if (type === 'staff' || type === 'teachers') {
    csv = { code: unique, prenom: 'Integration', nom: unique, email: `${unique}@integration.edaya.test`, ...(type === 'staff' ? { role: 'Secrétaire' } : {}) };
    collection = type === 'staff' ? 'staff-members' : 'teachers'; matches = row => row.code === unique;
  } else if (type === 'teacher_assignments') {
    const teacherId = crypto.randomUUID();
    await request('/core/commands/register-teacher', { id: teacherId, schoolId, code: unique, firstName: 'Integration', lastName: unique, email: null, phone: null, subjectId: null, isActive: true });
    const teaching = await get('class-subjects', entities.teachingId);
    const subject = await get('subjects', String(teaching.subjectId));
    csv = { code: unique, classe: klass.name, matiere: subject.name };
    collection = 'teacher-assignments'; matches = row => row.teacherId === teacherId && row.classSubjectId === teaching.id;
  } else if (type === 'chapters') {
    const offering = (await list('grade-level-subjects', { gradeLevelId: level.id }))[0];
    assert(offering, 'Required grade-level subject fixture missing');
    const subject = await get('subjects', String(offering.subjectId));
    csv = { niveau: level.name, matiere: subject.name, titre: unique, description: 'Integration chapter' };
    collection = 'subject-matters'; matches = row => row.name === unique;
  } else {
    // A new student per scenario avoids mutating the baseline or depending on another import.
    const studentId = crypto.randomUUID();
    await request('/core/commands/register-student', { id: studentId, schoolId, firstName: 'Integration', lastName: unique, sendAccountInvitation: false, createdAt: new Date().toISOString() });
    await request('/core/commands/update-student-profile', { studentId, firstName: 'Integration', lastName: unique, matricule: unique });
    await request('/core/commands/enroll-student', { id: crypto.randomUUID(), studentId, classGroupId: klass.id, createdAt: new Date().toISOString() });
    if (type === 'guardians') {
      csv = { code: unique, prenom: 'Integration', nom: unique, eleve_matricule: unique, email: `${unique}@integration.edaya.test` };
      collection = 'guardians'; matches = row => row.code === unique;
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
    // Query keys are sourced from the app's modal URL contract below.
    const modal = page.getByTestId('data-import-modal');
    await modal.waitFor({ state: 'visible', timeout: 15000 });
    await page.getByTestId('data-import-type-select').click();
    await page.getByTestId(`import-type-${type}`).click();
    await page.getByTestId('data-import-next').click();
    await page.getByTestId('import-file-input').setInputFiles({ name: `${type}.csv`, mimeType: 'text/csv', buffer: Buffer.from(encode(row)) });
    await page.getByTestId('data-import-next').click();
    await modal.locator('[data-testid$="-step-validate"]').waitFor({ state: 'visible', timeout: 15000 });
    return modal;
  }
  const invalid = { ...csv, [Object.keys(csv)[0]!]: '' };
  let modal = await upload(invalid);
  assert.equal(await page.getByTestId('data-import-start').isDisabled(), true, `${type}: invalid row must prevent execution`);
  assert(Number(await modal.getAttribute('data-validation-errors')) > 0, `${type}: missing validation error`);
  modal = await upload(csv);
  assert.equal(await modal.getAttribute('data-validation-errors'), '0', `${type}: valid fixture rejected: ${await modal.innerText()}`);
  await page.getByTestId('data-import-start').click();
  await page.waitForFunction(() => {
    const modal = document.querySelector('[data-testid="data-import-modal"]');
    return Number(modal?.getAttribute('data-import-created')) + Number(modal?.getAttribute('data-import-failed')) > 0;
  }, undefined, { timeout: 20000 });
  assert.equal(await modal.getAttribute('data-import-created'), '1', `${type}: import did not create the row: ${await modal.innerText()}`);
  assert.equal(await modal.getAttribute('data-import-failed'), '0', `${type}: import failed`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  const persisted = (await list(collection)).filter(matches);
  assert.equal(persisted.length, 1, `${type}: exactly one imported record must persist after reload`);
  return `${type}: invalid row rejected; one valid row imported and read back after reload`;
}
