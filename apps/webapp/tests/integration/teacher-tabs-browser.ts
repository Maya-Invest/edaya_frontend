import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';
import { peekOtp, sendOtpThroughUi } from './support/passwordless';
import { apiFetch } from './setup/journey-api';
import { exerciseTeacherRead } from './support/teacher-workflows';
import type { MatrixEntities } from '../../scripts/qa-matrix-support';

const artifacts = process.env.INTEGRATION_ARTIFACT_DIR ?? '/private/tmp';
mkdirSync(artifacts, { recursive: true });
const base = (process.env.WEBAPP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const schoolId = 'sch-edaya-ci-cocody';
ensurePlaywrightChromium();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(30_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
let yearId = '';
async function read(path: string, data: unknown) {
  const response = await apiFetch(page, base, `/core/${path}`, { method: 'POST', data, headers: { 'x-actor-kind': 'staff' }, schoolId, academicYearId: yearId });
  assert(response.ok(), `${path}: ${response.status()}`);
  return await response.json() as any;
}
async function chooseDate(date: string) {
  // Viewport changes and font layout must finish before measuring navigation.
  // Keep the strict before/after assertion below scoped to the date change.
  await page.evaluate(async () => {
    await document.fonts.ready;
    let previous = '';
    let stableFrames = 0;
    const deadline = performance.now() + 5000;
    while (performance.now() < deadline) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const elements = [...document.querySelectorAll('[data-testid="teacher-detail-identity"], [data-testid="drawer-tab-bar"], [data-testid="teacher-timetable-controls"]')];
      const current = JSON.stringify(elements.map(element => {
        const { top, width, height } = element.getBoundingClientRect();
        return { top, width, height };
      }));
      stableFrames = elements.length === 3 && current === previous ? stableFrames + 1 : 0;
      if (stableFrames >= 3) return;
      previous = current;
    }
    throw new Error('Teacher drawer layout did not settle before date navigation');
  });
  const fixedPositions = await page.locator('[data-testid="teacher-detail-identity"], [data-testid="drawer-tab-bar"], [data-testid="teacher-timetable-controls"]').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
  const input = page.locator('#teacher-timetable-date');
  await input.focus(); await input.fill(date); await input.dispatchEvent('change');
  await page.waitForURL(url => url.searchParams.get('date') === date);
  await page.locator(`[data-timetable-date="${date}"]`).waitFor();
  await page.waitForFunction((target) => {
    const heading = document.querySelector(`[data-timetable-date="${target}"]`);
    const toolbar = document.querySelector('[data-testid="teacher-timetable-controls"]');
    if (!heading || !toolbar) return false;
    const h = heading.getBoundingClientRect(); const t = toolbar.getBoundingClientRect();
    return h.top >= t.bottom - 1 && h.bottom <= innerHeight;
  }, date);
  const positionsAfter = await page.locator('[data-testid="teacher-detail-identity"], [data-testid="drawer-tab-bar"], [data-testid="teacher-timetable-controls"]').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
  assert.deepEqual(positionsAfter, fixedPositions, 'Teacher identity, tabs and date controls must stay fixed during date navigation');
  assert.equal(await page.locator('[data-teacher-drawer-scroll]').evaluate(element => element.scrollTop), 0);
  assert.equal(await page.locator(`[data-timetable-date="${date}"]`).evaluate(element => getComputedStyle(element).fontWeight), '700');
}
try {
  await page.goto(`${base}/login?panel=signin&method=email-otp&stage=form`);
  const sent = page.waitForResponse(response => response.url().endsWith('/auth/edaya/otp/start'));
  await sendOtpThroughUi(page, 'a.kone@ecole-ci.edaya.dev');
  const { challenge } = await (await sent).json();
  const code = await peekOtp('a.kone@ecole-ci.edaya.dev', 'email', challenge);
  await page.locator('[data-testid="auth-code"]:visible').fill(code);
  await page.locator('[data-testid="auth-submit"]:visible').click();
  await page.waitForURL(/\/dashboard/);
  await page.getByTestId('academic-year-trigger').waitFor();
  await page.waitForFunction(() => Boolean(document.querySelector('[data-testid="academic-year-trigger"]')?.getAttribute('data-year-id')));
  yearId = await page.getByTestId('academic-year-trigger').getAttribute('data-year-id') ?? '';
  assert(yearId);
  const years = await read('entities/academic-years/list', { schoolId });
  const year = years.find((row: any) => row.id === yearId);
  assert(year);
  year.startDate = year.startDate.slice(0, 10);
  year.endDate = year.endDate.slice(0, 10);
  const assignments = await read('entities/teacher-assignments/list', { academicYearId: yearId, status: 'active' });
  const teacherId = assignments.find((row: any) => row.kind === 'homeroom' && assignments.some((other: any) => other.teacherId === row.teacherId && other.kind === 'subject'))?.teacherId;
  assert(teacherId, 'Local demo needs a teacher with both assignment kinds');
  const teacherAssignments = assignments.filter((row: any) => row.teacherId === teacherId);
  const assignmentUrl = `${base}/school/teachers/${teacherId}/assignments`;
  await page.goto(assignmentUrl);
  const homeroom = page.getByTestId('teacher-assignments-homeroom');
  const subject = page.getByTestId('teacher-assignments-subject');
  await homeroom.waitFor();
  assert.equal(await homeroom.locator('li').count(), teacherAssignments.filter((row: any) => row.kind === 'homeroom').length);
  assert.equal(await subject.locator('li').count(), teacherAssignments.filter((row: any) => row.kind === 'subject').length);
  assert(await homeroom.evaluate((element) => Boolean(element.compareDocumentPosition(document.querySelector('[data-testid="teacher-assignments-subject"]')!) & Node.DOCUMENT_POSITION_FOLLOWING)));
  assert.equal(await page.getByText(/^(subject teacher|homeroom teacher|enseignant de matière|professeur principal)$/i).count(), 0);
  assert.equal(await page.getByRole('button', { name: /add assignment|ajouter une affectation/i }).count(), 1);
  await page.getByRole('button', { name: /add assignment|ajouter une affectation/i }).click();
  await page.getByTestId('form-modal').waitFor();
  await page.keyboard.press('Escape');
  await page.getByTestId('form-modal').waitFor({ state: 'hidden' });
  assert.equal(await homeroom.locator('li').count(), teacherAssignments.filter((row: any) => row.kind === 'homeroom').length, 'Closing the assignment modal must preserve the drawer data');
  assert.equal(await subject.locator('li').count(), teacherAssignments.filter((row: any) => row.kind === 'subject').length);
  await page.screenshot({ path: resolve(artifacts, 'teacher-assignments-fr.png') });

  // Read-only response fixtures exercise the empty section variants without changing assignments.
  for (const kind of ['homeroom', 'subject', 'empty']) {
    await page.route('**/entities/teacher-assignments/list', async route => {
      const response = await route.fetch();
      const rows = await response.json() as any[];
      await route.fulfill({ response, json: rows.filter(row => row.kind === kind) });
    });
    await page.reload(); await homeroom.waitFor();
    assert.equal(await homeroom.locator('li').count(), kind === 'homeroom' ? teacherAssignments.filter((row: any) => row.kind === kind).length : 0);
    assert.equal(await subject.locator('li').count(), kind === 'subject' ? teacherAssignments.filter((row: any) => row.kind === kind).length : 0);
    await page.unroute('**/entities/teacher-assignments/list');
  }

  console.log('Assignment sections and empty states passed');
  const timetableUrl = `${base}/school/teachers/${teacherId}/timetable`;
  const realResponse = page.waitForResponse(response => response.url().endsWith('/queries/get-teacher-timetable'));
  await page.goto(timetableUrl);
  const response = await realResponse;
  assert(response.ok());
  const realData = await response.json();
  await page.locator('#teacher-timetable-date').waitFor();
  assert.equal(await page.locator('#teacher-timetable-date').getAttribute('min'), year.startDate);
  assert.equal(await page.locator('#teacher-timetable-date').getAttribute('max'), year.endDate);
  console.log(`Teacher timetable real API: ${realData.events.length} events for selected year`);

  // Deterministic dense year validates progressive rendering and jumps beyond the initial batch.
  const start = new Date(`${year.startDate}T12:00:00Z`);
  const events = Array.from({ length: 100 }, (_, index) => {
    const date = new Date(start); date.setUTCDate(date.getUTCDate() + index * 2);
    return { kind: 'lesson', id: `agenda-check-${index}`, lessonSessionId: `agenda-check-${index}`, classGroupId: teacherAssignments.find((row: any) => row.classGroupId)?.classGroupId ?? 'class', title: `Session ${index + 1}`, startsAt: date.toISOString(), endsAt: new Date(date.getTime() + 3600000).toISOString(), status: 'pending' };
  }).filter(event => event.startsAt.slice(0, 10) <= year.endDate);
  let requests = 0;
  let empty = false;
  await page.route('**/queries/get-teacher-timetable', route => {
    requests += 1;
    const input = route.request().postDataJSON();
    return route.fulfill({ json: { ...input, events: empty ? [] : events } });
  });
  await page.reload(); await page.locator('#teacher-timetable-date').waitFor();
  await exerciseTeacherRead(page, base, 'Emploi du temps', {} as MatrixEntities);
  const loadedRequests = requests;
  const lastDate = events.at(-1)!.startsAt.slice(0, 10);
  await chooseDate(lastDate);
  assert(await page.locator('#teacher-timetable-date').evaluate(element => document.activeElement === element));
  assert.equal(await page.getByTestId('teacher-timetable-session').count(), events.length);
  const emptyDate = new Date(start); emptyDate.setUTCDate(emptyDate.getUTCDate() + 1);
  await chooseDate(emptyDate.toISOString().slice(0, 10));
  assert.equal(await page.getByTestId('teacher-timetable-empty-date').count(), 1);
  const nextEmpty = new Date(start); nextEmpty.setUTCDate(nextEmpty.getUTCDate() + 3);
  await chooseDate(nextEmpty.toISOString().slice(0, 10));
  assert.equal(await page.getByTestId('teacher-timetable-empty-date').count(), 1);
  assert.equal(await page.locator(`[data-timetable-date="${emptyDate.toISOString().slice(0, 10)}"]`).count(), 0);
  assert.equal(requests, loadedRequests, 'Date changes must not refetch');
  await chooseDate(events[0]!.startsAt.slice(0, 10));
  await page.screenshot({ path: resolve(artifacts, 'teacher-timetable-fr.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await chooseDate(lastDate);
  assert(await page.getByTestId('teacher-year-timetable').evaluate(element => element.scrollWidth <= element.clientWidth));
  await page.screenshot({ path: resolve(artifacts, 'teacher-timetable-mobile.png') });
  const sessionList = page.getByTestId('teacher-timetable-sessions');
  const identityTop = await page.getByTestId('teacher-detail-identity').evaluate(element => element.getBoundingClientRect().top);
  await sessionList.focus();
  const beforeScroll = await sessionList.evaluate(element => element.scrollTop);
  await page.keyboard.press('PageUp');
  await page.waitForFunction(previous => document.querySelector('[data-testid="teacher-timetable-sessions"]')!.scrollTop < previous, beforeScroll);
  assert.equal(await page.getByTestId('teacher-detail-identity').evaluate(element => element.getBoundingClientRect().top), identityTop);
  assert.equal(await page.locator('[data-teacher-drawer-scroll]').evaluate(element => element.scrollTop), 0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => localStorage.setItem('lang', 'en'));
  await page.goto(`${timetableUrl}?week=${year.startDate}`);
  await page.waitForURL(url => url.searchParams.get('date') === year.startDate && !url.searchParams.has('week'));
  await page.getByLabel('Go to date').waitFor();
  await page.screenshot({ path: resolve(artifacts, 'teacher-timetable-en.png') });
  empty = true;
  await page.reload();
  await page.getByText('No sessions in this academic year.', { exact: true }).waitFor();
  assert.equal(await page.getByTestId('teacher-timetable-empty-date').count(), 1);
  assert.equal(await page.getByTestId('teacher-timetable-session').count(), 0);
  // Old or missing year bounds keep navigation honest without altering saved school data.
  let missingBounds = false;
  await page.route('**/entities/academic-years/list', async route => {
    const response = await route.fetch();
    const rows = await response.json() as any[];
    await route.fulfill({ response, json: rows.map(row => row.id === yearId ? { ...row, startDate: missingBounds ? '' : '2024-09-01T00:00:00.000Z', endDate: '2025-06-30T00:00:00.000Z' } : row) });
  });
  await page.goto(timetableUrl);
  await page.locator('#teacher-timetable-date').waitFor();
  assert.equal(await page.locator('#teacher-timetable-date').inputValue(), '2025-06-30');
  assert(await page.getByRole('button', { name: 'Today', exact: true }).isDisabled());
  await page.getByText('Today is outside the selected academic year.', { exact: true }).waitFor();
  const previousRequests = requests;
  missingBounds = true;
  await page.reload();
  await page.getByText('Select an academic year with valid dates to view the timetable.', { exact: true }).waitFor();
  assert.equal(requests, previousRequests, 'Missing year dates must not request an unrelated range');
  await page.unroute('**/entities/academic-years/list');
  await page.unroute('**/queries/get-teacher-timetable');
  await page.goto(assignmentUrl); await homeroom.waitFor();
  await page.getByRole('heading', { name: 'Homeroom assignments', exact: true }).waitFor();
  await page.screenshot({ path: resolve(artifacts, 'teacher-assignments-en.png') });
  assert.deepEqual(errors, []);
  console.log('Teacher tabs browser checks passed: assignment sections and empty states, real full-year API, date navigation without refetching, empty dates, progressive rendering, legacy links, FR/EN and mobile.');
}
catch (error) {
  console.error('Teacher tabs URL:', page.url());
  console.error('Teacher tabs page errors:', errors);
  console.error('Agenda geometry:', await page.evaluate(() => {
    const date = new URL(location.href).searchParams.get('date');
    return [...document.querySelectorAll(`[data-teacher-drawer-scroll], [data-testid="teacher-timetable-controls"], [data-timetable-date="${date}"]`)].map(element => ({ rect: element.getBoundingClientRect().toJSON(), padding: getComputedStyle(element).paddingTop }));
  }).catch(() => []));
  await page.screenshot({ path: resolve(artifacts, 'teacher-tabs-failure.png') }).catch(() => {});
  throw error;
}
finally { await browser.close(); }
