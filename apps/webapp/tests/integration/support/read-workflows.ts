import { chooseOption, selectTrigger } from './custom-select';
import assert from 'node:assert/strict';
import type { Locator, Page } from 'playwright';
import type { MatrixEntities } from '../../../scripts/qa-matrix-support';
import { apiFetch } from '../setup/journey-api';
import { uiCommand, waitForMutationDialog } from './ui-command';
import { exerciseStudentDocument } from './document-workflows';
import { listSearchInput, waitForPageQuery } from '../../../scripts/qa-harness-ui';

type Data = Record<string, any>;
type ReadContext = { page: Page; base: string; entities: MatrixEntities };
type ReadScenario = (ctx: ReadContext) => Promise<void>;
async function entity(ctx: ReadContext, collection: string, id: unknown): Promise<Data> {
  assert(typeof id === 'string' && id.length > 0, `Required ${collection} fixture ID missing`);
  const response = await apiFetch(ctx.page, ctx.base, `/core/entities/${collection}/${encodeURIComponent(id)}`);
  assert(response.ok(), `${collection} fixture HTTP ${response.status()}`);
  const data = await response.json() as Data;
  assert(data?.id === id, `Required ${collection} fixture missing`);
  return data;
}
async function list(ctx: ReadContext, collection: string, filter: Data): Promise<Data[]> {
  const response = await apiFetch(ctx.page, ctx.base, `/core/entities/${collection}/list`, {method:'POST',data:filter});
  assert(response.ok(), `${collection} fixture HTTP ${response.status()}`);
  const data = await response.json() as Data[] | {items:Data[]};
  const rows = Array.isArray(data) ? data : data.items;
  assert(rows.length > 0, `Required nonempty ${collection} fixture missing`);
  return rows;
}
async function shown(ctx: ReadContext, value: unknown, scope = 'main') {
  assert(typeof value === 'string' && value.length > 0, 'Required visible fixture text missing');
  await ctx.page.locator(scope).getByText(value, {exact:false}).filter({visible:true}).first().waitFor({state:'visible',timeout:15000});
}
const fixtureName = (collection: string, key: keyof MatrixEntities, field = 'name', scope = 'main'): ReadScenario => async ctx => {
  const data = await entity(ctx, collection, ctx.entities[key]);
  await shown(ctx, data[field], scope);
};
const studentProfile: ReadScenario = async ctx => {
  const student = await entity(ctx, 'students', ctx.entities.studentId);
  await shown(ctx, student.lastName, '[role="dialog"].ui-drawer');
  await shown(ctx, student.firstName, '[role="dialog"].ui-drawer');
};
const grades: ReadScenario = async ctx => {
  const results = await list(ctx, 'assessment-results', {studentId:ctx.entities.studentId});
  const result = results.find(row => row.assessmentId === ctx.entities.evaluationId);
  assert(result && typeof result.score === 'number', 'Required recorded assessment mark missing');
  const assessment = await entity(ctx, 'assessments', result.assessmentId);
  await shown(ctx, assessment.title, '[role="dialog"].ui-drawer');
  const link = ctx.page.locator(`[role="dialog"].ui-drawer a[href*="/evaluations/${result.assessmentId}/"]`);
  await link.waitFor({state:'visible'});
  assert((await link.locator('..').innerText()).includes(result.score.toFixed(1)), 'Rendered mark differs from the persisted assessment result');
};
const enrollments: ReadScenario = async ctx => {
  const rows = await list(ctx, 'enrollments', {studentId:ctx.entities.studentId});
  const enrollment = rows.find(row => row.status === 'active');
  assert(enrollment, 'Required active enrollment missing');
  const classroom = await entity(ctx, 'class-groups', enrollment.classGroupId);
  await shown(ctx, classroom.name, '[role="dialog"].ui-drawer');
  const year = await entity(ctx, 'academic-years', enrollment.academicYearId);
  await shown(ctx, year.name, '[role="dialog"].ui-drawer');
};
const finance: ReadScenario = async ctx => {
  const charges = await list(ctx, 'student-charges', {studentId:ctx.entities.studentId});
  for (const charge of charges) {
    await shown(ctx, charge.label, '[role="dialog"].ui-drawer');
  }
};
const inbox: ReadScenario = async ctx => {
  const delivery = await entity(ctx, 'message-deliveries', ctx.entities.deliveryId);
  await shown(ctx, delivery.title);
};
const documents: ReadScenario = async ctx => {
  await exerciseStudentDocument(ctx.page, ctx.base);
  const rows = await list(ctx, 'document-issuances', {studentId:ctx.entities.studentId});
  const issuance = rows.find(row => row.status === 'ready' || row.status === 'voided');
  assert(issuance, 'Required rendered document fixture missing');
  await ctx.page.locator(`[data-document-type="${issuance.templateKey}"]`).getByRole('button').click();
  await ctx.page.getByRole('menuitem', { name: /view history|voir l[’']historique/i }).click();
  await ctx.page.locator(`[data-issuance-id="${issuance.id}"]`).waitFor({state:'visible'});
};
const attendance: ReadScenario = async ctx => {
  const rows = await list(ctx, 'attendance', {studentId:ctx.entities.studentId});
  assert(rows.some(row => ['absent','present','late','excused'].includes(row.status)), 'Required attendance record missing');
  await ctx.page.locator('[role="dialog"].ui-drawer').getByText(/présent|absent|retard|justifié|present|late|excused/i).first().waitFor();
};

async function exerciseFilter(ctx: ReadContext, positive: string, row: Locator, urlField?: string) {
  assert(positive, 'Required filter fixture value missing');
  const select = ctx.page.locator('[data-select-field]:has([data-testid="list-filter-select"]) select[data-select-value]').filter({has:ctx.page.locator(`option[value="${positive}"]`)}).first();
  const openFilter = async () => {
    if (!await selectTrigger(select).isVisible()) await ctx.page.getByTestId('collection-filter').first().click();
    await selectTrigger(select).waitFor();
  };
  const choose = async (value: string) => {
    // Server-filtered lists can remount the header and close its popover.
    await openFilter();
    await chooseOption(select, value);
    if (urlField) await ctx.page.waitForURL(url => (url.searchParams.get(urlField) ?? 'all') === value);
    await waitForPageQuery(ctx.page);
  };
  await openFilter();
  const other = await select.locator('option').evaluateAll((options,positive)=>options.map(option=>(option as HTMLOptionElement).value).find(value=>value && value!=='all' && value!==positive),positive);
  assert(other, 'Required contrasting filter option missing');
  await choose(positive);
  await row.waitFor({state:'visible'});
  await choose(other);
  await row.waitFor({state:'hidden'});
  await choose(positive);
  await row.waitFor({state:'visible'});
  await choose('all');
}



const searchFixture = async (ctx: ReadContext, value: string, row: Locator) => {
  const search = listSearchInput(ctx.page);
  await search.fill(value);
  await row.waitFor({state:'visible'});
  await search.fill(`unmatched-${crypto.randomUUID()}`);
  await row.waitFor({state:'hidden'});
  await search.fill('');
  await row.waitFor({state:'visible'});
};
const paymentFixture = async (ctx: ReadContext) => {
  const account = (await list(ctx,'student-year-accounts',{studentId:ctx.entities.studentId}))[0]!;
  return (await list(ctx,'payments',{accountId:account.id}))[0]!;
};

/** IDs name executable contracts. Labels and route visits never select a behavioral assertion. */
export const READ_SCENARIOS: Record<string, ReadScenario> = {
  'web.scenario.0021': async ctx => {
    const student = await entity(ctx,'students',ctx.entities.studentId);
    await searchFixture(ctx,student.lastName,ctx.page.locator(`[data-entity-id="${student.id}"]`));
  },
  'web.scenario.0022': async ctx => {
    await exerciseFilter(ctx,ctx.entities.classId!,ctx.page.locator(`[data-entity-id="${ctx.entities.studentId}"]`));
  },
  'web.scenario.0023': async ctx => {
    for(const status of ['active','inactive','archived'] as const) {
      const fixture=ctx.entities.filterFixtures.studentsByStatus?.[status];
      assert(fixture,`Required ${status} student fixture missing`);
      await exerciseFilter(ctx,status,ctx.page.locator(`[data-entity-id="${fixture.id}"]`));
    }
  },
  'web.scenario.0062': async ctx => {
    const event=await entity(ctx,'calendar-events',ctx.entities.calendarEventId);
    await exerciseFilter(ctx,({holiday:'holiday',break:'vacation',other:'closure',event:'ceremony'} as Record<string,string>)[event.kind]!,ctx.page.locator('main').getByText(event.title,{exact:true}));
  },
  'web.scenario.0106': async ctx => {
    const subject=await entity(ctx,'subjects',ctx.entities.subjectId);
    await searchFixture(ctx,subject.name,ctx.page.locator('main').getByText(subject.name,{exact:true}).filter({visible:true}).first());
  },
  'web.scenario.0116': async ctx => {
    const completeDay = decodeURIComponent(ctx.entities.dayId ?? '').split(':').at(-1);
    assert(completeDay && /^\d{4}-\d{2}-\d{2}$/.test(completeDay), 'Required complete attendance fixture day missing');
    const day=(offset:number)=>{const value=new Date(`${completeDay}T00:00:00Z`);value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10);};
    for(const [status,offset] of [['marked',0],['partial',1],['unmarked',2]] as const) {
      await exerciseFilter(ctx,status,ctx.page.locator(`[data-attendance-id="${ctx.entities.classId}:${day(offset)}"]`),'completion');
    }
  },
  'web.scenario.0127': async ctx => {
    const charge=await entity(ctx,'student-charges',ctx.entities.billingId);
    const enrollment=await entity(ctx,'student-service-enrollments',charge.enrollmentId);
    const fee=await entity(ctx,'catalog-services',enrollment.catalogServiceId);
    await exerciseFilter(ctx,fee.category ?? 'other',ctx.page.locator('main').getByText(fee.name,{exact:true}));
  },
  'web.scenario.0137': async ctx => {
    const payment=await paymentFixture(ctx);
    await exerciseFilter(ctx,payment.status,ctx.page.locator(`[data-entity-id="${payment.id}"]`),'status');
  },
  'web.scenario.0138': async ctx => {
    const payment=await paymentFixture(ctx);
    await exerciseFilter(ctx,ctx.entities.classId!,ctx.page.locator(`[data-entity-id="${payment.id}"]`));
  },
  'web.scenario.0145': async ctx => {
    const yearId=await ctx.page.getByTestId('academic-year-trigger').getAttribute('data-year-id');
    const year=await entity(ctx,'academic-years',yearId);
    await exerciseFilter(ctx,year.status,ctx.page.locator('main').getByRole('heading',{name:year.name,exact:true}));
  },
  'web.scenario.0157': async ctx => {
    assert(ctx.entities.configurationSubjectId,'Required catalog subject route missing');
    await ctx.page.locator(`a[href*="gradeLevel=${ctx.entities.gradeLevelId}"]`).filter({ visible: true }).first().click();
    await ctx.page.locator(`[data-entity-id="${ctx.entities.configurationSubjectId}"]`).waitFor();
  },
  'web.scenario.0169': async ctx => {
    const entry=(await list(ctx,'disciplinary-actions',{}))[0]!;
    await exerciseFilter(ctx,entry.kind,ctx.page.locator('main').getByText(entry.name,{exact:true}));
  },
  'web.scenario.0174': async ctx => {
    const entry=(await list(ctx,'staff-permission-profiles',{}))[0]!;
    await searchFixture(ctx,entry.name,ctx.page.locator('main').getByText(entry.name,{exact:true}));
  },

  'web.scenario.0014': inbox,
  'web.scenario.0018': async ctx => {
    const [response] = await Promise.all([
      ctx.page.waitForResponse(response => /\/entities\/staff-members\/[^/]+$/.test(response.url()) && response.request().method() === 'GET'),
      ctx.page.reload({waitUntil:'domcontentloaded'}),
    ]);
    assert(response.ok(), `Notification settings HTTP ${response.status()}`);
    const staff = await response.json();
    const selected = ctx.page.locator('main input[type=radio]:checked');
    await selected.waitFor();
    assert.equal(await selected.inputValue(), staff.notificationEmail ? 'custom' : 'default');
    if (staff.notificationEmail) assert.equal(await ctx.page.locator('main input[type=email]').inputValue(), staff.notificationEmail);
  },
  'web.scenario.0017': async ctx => {
    await inbox(ctx);
    const d = await entity(ctx,'message-deliveries',ctx.entities.deliveryId);
    await ctx.page.goto(`${ctx.base}/account/inbox`, { waitUntil: 'domcontentloaded' });
    await ctx.page.locator('main tbody button.ui-record-target').filter({ hasText: d.title }).click();
    const drawer = ctx.page.getByTestId('inbox-message-drawer');
    await drawer.waitFor({state:'visible'});
    await shown(ctx,d.body,'[data-testid="inbox-message-drawer"]');
    await drawer.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
    const bounds = await drawer.boundingBox();
    const viewport = ctx.page.viewportSize();
    assert(bounds && viewport, 'Inbox drawer geometry unavailable');
    assert(Math.abs(bounds.y) <= 1 && Math.abs(bounds.height - viewport.height) <= 1, 'Inbox drawer must fill the viewport height');
    assert(Math.abs(bounds.x + bounds.width - viewport.width) <= 1, 'Inbox drawer must meet the right viewport edge');
    assert(Math.abs(bounds.width - (viewport.width >= 1024 ? viewport.width / 2 : viewport.width)) <= 1, 'Inbox drawer must use the shared responsive width');
    await ctx.page.keyboard.press('Escape');
    await drawer.waitFor({state:'hidden'});
    await ctx.page.waitForURL(url => /\/account\/inbox\/?$/.test(url.pathname));
    const focusedRow = ctx.page.locator('main button:focus');
    await focusedRow.waitFor({state:'visible'});
    assert((await focusedRow.innerText()).includes(d.title), 'Closing the inbox drawer must restore focus to its message row');
    await focusedRow.click();
    await drawer.waitFor({state:'visible'});
  },
  'web.scenario.0020': fixtureName('students','studentId','lastName'),
  'web.scenario.0028': studentProfile,
  'web.scenario.0034': grades,
  'web.scenario.0037': finance,
  'web.scenario.0039': enrollments,
  'web.scenario.0040': documents,
  'web.scenario.0042': async ctx => {
    const guardian = await entity(ctx,'guardians',ctx.entities.guardianId);
    const search = listSearchInput(ctx.page);
    await search.fill(guardian.lastName);
    await shown(ctx,guardian.lastName);
    await search.fill(`no-match-${crypto.randomUUID()}`);
    await ctx.page.locator('main').getByText(guardian.lastName,{exact:false}).first().waitFor({state:'hidden'});
    await search.fill('');
    await shown(ctx,guardian.lastName);
  },
  'web.scenario.0045': fixtureName('students','studentId','lastName','[role="dialog"].ui-drawer'),
  'web.scenario.0046': fixtureName('staff-members','staffId','lastName'),
  'web.scenario.0051': fixtureName('teachers','teacherId','lastName'),
  'web.scenario.0064': async ctx => {
    const activity = await entity(ctx,'activities',ctx.entities.activityId);
    await exerciseFilter(ctx,activity.category,ctx.page.locator('main').getByText(activity.name,{exact:true}));
  },
  'web.scenario.0069': async ctx => {
    const announcement = await entity(ctx,'announcements',ctx.entities.announcementId);
    await exerciseFilter(ctx,announcement.status,ctx.page.locator('main').getByText(announcement.title,{exact:true}));
  },
  'web.scenario.0075': async ctx => {
    const response = await apiFetch(ctx.page,ctx.base,'/core/queries/get-family-feedback-campaign',{method:'POST',data:{id:ctx.entities.familyFeedbackCampaignId}});
    assert(response.ok());
    const campaign = await response.json() as Data;
    await exerciseFilter(ctx,campaign.status,ctx.page.locator(`[data-campaign-id="${campaign.id}"]`));
  },
  'web.scenario.0077': async ctx => {
    const response = await apiFetch(ctx.page,ctx.base,'/core/queries/get-family-feedback-campaign',{method:'POST',data:{id:ctx.entities.familyFeedbackCampaignId}});
    assert(response.ok());
    const campaign = await response.json() as Data;
    const period = await entity(ctx,'academic-periods',campaign.academicPeriodId);
    const moderator = await entity(ctx,'staff-members',campaign.moderatorStaffId);
    const assignment = await entity(ctx,'teacher-assignments',campaign.teacherAssignmentId);
    const teacher = await entity(ctx,'teachers',assignment.teacherId);
    await shown(ctx,period.name ?? period.label,'[role="dialog"].ui-drawer');
    await shown(ctx,moderator.lastName,'[role="dialog"].ui-drawer');
    await shown(ctx,teacher.lastName,'[role="dialog"].ui-drawer');
  },
  'web.scenario.0090': async ctx => {
    const student = await entity(ctx,'students',ctx.entities.studentId);
    await exerciseFilter(ctx,student.status,ctx.page.locator('main').getByText(student.lastName,{exact:false}).filter({visible:true}).first());
  },
  'web.scenario.0110': async ctx => {
    const assessment = await entity(ctx,'assessments',ctx.entities.evaluationId);
    await exerciseFilter(ctx,assessment.kind,ctx.page.locator('main').getByText(assessment.title,{exact:true}));
  },
  'web.scenario.0118': async ctx => {
    const report = await entity(ctx,'results',ctx.entities.reportCardId);
    const student = await entity(ctx,'students',report.studentId);
    await exerciseFilter(ctx,report.status,ctx.page.locator('main tr').filter({hasText:student.lastName}),'status');
  },
  'web.scenario.0066': fixtureName('activities','activityId','name','[role="dialog"].ui-drawer'),
  'web.scenario.0067': async ctx => {
    const enrollment = (await list(ctx,'activity-enrollments',{activityId:ctx.entities.activityId}))[0]!;
    await shown(ctx,(await entity(ctx,'students',enrollment.studentId)).lastName,'[role="dialog"].ui-drawer');
  },
  'web.scenario.0068': fixtureName('class-groups','classId','name','[role="dialog"].ui-drawer'),
  'web.scenario.0081': async ctx => {
    const [response] = await Promise.all([
      ctx.page.waitForResponse(response=>response.url().endsWith('/queries/preview-family-feedback-audience')),
      ctx.page.reload({waitUntil:'domcontentloaded'}),
    ]);
    assert(response.ok());
    const audience = await response.json();
    assert(audience.eligibleCount > 0, 'Required eligible feedback audience missing');
    await shown(ctx,`${audience.eligibleCount} élèves éligibles`,'[role="dialog"].ui-drawer');
    await shown(ctx,`${audience.completedCount} réponses`,'[role="dialog"].ui-drawer');
  },
  'web.scenario.0082': async ctx => {
    const [response] = await Promise.all([
      ctx.page.waitForResponse(response=>response.url().endsWith('/queries/list-family-feedback-comments')),
      ctx.page.reload({waitUntil:'domcontentloaded'}),
    ]);
    assert(response.ok());
    const {comments} = await response.json();
    assert(Array.isArray(comments), 'Required moderation response missing');
    if (comments.length) for(const comment of comments) await shown(ctx,comment.comment,'[role="dialog"].ui-drawer');
    else await shown(ctx,'Aucun commentaire.','[role="dialog"].ui-drawer');
    const campaign = await apiFetch(ctx.page,ctx.base,'/core/queries/get-family-feedback-campaign',{method:'POST',data:{id:ctx.entities.familyFeedbackCampaignId}});
    assert(campaign.ok());
    assert.equal((await campaign.json() as Data).themeDraft,'QA theme','The theme entered in the UI must remain persisted');
  },
  'web.scenario.0089': fixtureName('students','studentId','lastName'),
  'web.scenario.0092': studentProfile,
  'web.scenario.0093': grades,
  'web.scenario.0094': attendance,
  'web.scenario.0095': async ctx => { const incidents = await list(ctx,'incidents',{studentId:ctx.entities.studentId}); await shown(ctx,incidents[0]!.title,'[role="dialog"].ui-drawer'); },
  'web.scenario.0096': finance,
  'web.scenario.0097': async ctx => {
    const reports = await list(ctx,'results',{studentId:ctx.entities.studentId});
    const report = reports.find(row=>row.status==='published');
    assert(report,'Required published student report missing');
    await ctx.page.locator('[role="dialog"].ui-drawer').getByText(/^(publié|published)$/i).waitFor();
    assert(typeof report.overallAverage === 'number','Required computed report average missing');
    await shown(ctx,String(report.overallAverage),'[role="dialog"].ui-drawer');
  },
  'web.scenario.0098': enrollments,
  'web.scenario.0100': async ctx => {
    const session = await entity(ctx,'lesson-sessions',ctx.entities.sessionId);
    const teaching = await entity(ctx,'class-subjects',session.classSubjectId);
    const subject = await entity(ctx,'subjects',teaching.subjectId);
    await shown(ctx,subject.name,'.edaya-timetable-calendar');
    const picker = ctx.page.locator('#planning-week-picker');
    await picker.waitFor();
    const week = await picker.inputValue();
    const sessionDate = Date.parse(String(session.startsAt).slice(0,10));
    assert(sessionDate >= Date.parse(week) && sessionDate < Date.parse(week) + 7*86400000, 'Fixture session must be in the visible week');
  },
  'web.scenario.0101': async ctx => {
    const picker = ctx.page.locator('#planning-week-picker');
    await picker.waitFor();
    const before = await picker.inputValue();
    await ctx.page.getByRole('button',{name:/semaine suivante|next week/i}).click();
    await ctx.page.waitForFunction(previous => (document.querySelector('#planning-week-picker') as HTMLInputElement)?.value !== previous,before);
    assert.equal(Date.parse(await picker.inputValue()) - Date.parse(before),7*86400000);
    await ctx.page.getByRole('button',{name:/semaine précédente|previous week/i}).click();
    await ctx.page.waitForFunction(previous => (document.querySelector('#planning-week-picker') as HTMLInputElement)?.value === previous,before);
  },
  'web.scenario.0102': fixtureName('lesson-sessions','sessionId','displayLabel','[role="dialog"].ui-drawer'),
  'web.scenario.0103': async ctx => {
    const classroom = await entity(ctx, 'class-groups', ctx.entities.classId);
    const configure = async (mode: string) => {
      const response = await apiFetch(ctx.page, ctx.base, '/core/commands/update-class-group-configuration', { method: 'POST', data: {
        classGroupId: classroom.id, name: classroom.name, capacity: classroom.capacity ?? null,
        homeroomStaffId: classroom.homeroomStaffId ?? null, attendanceMode: mode,
      } });
      assert(response.ok(), `Session attendance configuration HTTP ${response.status()}`);
      await ctx.page.reload({ waitUntil: 'domcontentloaded' });
      await waitForPageQuery(ctx.page);
    };
    try {
      await configure('session');
      const drawer = ctx.page.locator('[role="dialog"].ui-drawer');
      await drawer.getByRole('button', { name: /^(faire l’appel|take attendance)$/i }).click();
      const task = ctx.page.getByTestId('form-modal');
      await task.getByRole('button', { name: /tout marquer présent|mark all present|tous présents/i }).click();
      await uiCommand(ctx.page, '/commands/record-lesson-session-attendance', () => task.getByRole('button', { name: /^(enregistrer|save)$/i }).click());
      await task.getByRole('button', { name: /^(fermer|close)$/i }).last().click();
      await task.waitFor({ state: 'hidden' });
      await ctx.page.reload({ waitUntil: 'domcontentloaded' });
      const rows = await list(ctx, 'attendance', { lessonSessionId: ctx.entities.sessionId });
      assert(rows.length >= 2 && rows.every(row => row.status === 'present'), 'Every enrolled student must have persisted present attendance');
      await shown(ctx, (await entity(ctx, 'students', ctx.entities.studentId)).lastName, '[role="dialog"].ui-drawer');
    } finally { await configure(classroom.attendanceMode); }
  },
  'web.scenario.0104': async ctx => {
    const content = `Integration lesson ${crypto.randomUUID()}`;
    const button = ctx.page.getByTestId('session-logbook-edit').first();
    await button.click();
    const dialog = ctx.page.getByRole('dialog');
    await dialog.locator('textarea').nth(0).fill(content);
    await dialog.getByRole('checkbox').first().check();
    await dialog.getByRole('checkbox',{name:/completed in this session|terminé pendant cette séance/i}).first().check();
    await dialog.locator('textarea').nth(1).fill(content);

    await uiCommand(ctx.page,'/commands/save-teacher-logbook',()=>dialog.getByTestId('form-modal-submit').click());
    await waitForMutationDialog(ctx.page);
    await shown(ctx,content,'[role="dialog"].ui-drawer');
    await button.click();
    await dialog.locator('textarea').first().waitFor();
    assert.equal(await dialog.locator('textarea').first().inputValue(),content);
    await dialog.getByRole('button',{name:/^(annuler|cancel)$/i}).click();
    await waitForMutationDialog(ctx.page);
    await ctx.page.reload({waitUntil:'domcontentloaded'});
    assert.equal((await entity(ctx,'lesson-sessions',ctx.entities.sessionId)).sessionNote,content);
    const progress = await list(ctx,'class-subject-progress',{lessonSessionId:ctx.entities.sessionId});
    assert(progress.some(row=>row.completed===true && row.notes===content));
    await shown(ctx,content,'[role="dialog"].ui-drawer');
  },
  'web.scenario.0108': async ctx => {
    const matters = await list(ctx,'class-subject-matters',{classSubjectId:ctx.entities.teachingId});
    const matter = await entity(ctx,'subject-matters',matters[0]!.subjectMatterId);
    await shown(ctx,matter.name,'[role="dialog"].ui-drawer');
  },
  'web.scenario.0109': async ctx => {
    const session = await entity(ctx,'lesson-sessions',ctx.entities.sessionId);
    await shown(ctx,session.sessionNote,'[role="dialog"].ui-drawer');
  },
  'web.scenario.0160': async ctx => {
    assert(ctx.entities.configurationSubjectId, 'Required catalog subject route ID missing');
    await ctx.page.waitForURL(url => url.pathname.endsWith(`/configuration/structure/subjects/${ctx.entities.configurationSubjectId}/progression`));
    await ctx.page.getByRole('dialog', { name: /catalogue des matières|subjects catalog/i }).waitFor();
  },
  'web.scenario.0105': fixtureName('subjects','subjectId'),
  'web.scenario.0113': fixtureName('assessments','evaluationId','title','[role="dialog"].ui-drawer'),
  'web.scenario.0115': async ctx => {
    assert(ctx.entities.dayId,'Required recorded attendance day missing');
    const row = ctx.page.locator(`[data-attendance-id="${decodeURIComponent(ctx.entities.dayId!)}"]`);
    await row.waitFor();
    const records = await list(ctx,'attendance',{studentId:ctx.entities.studentId});
    assert(records.some(row=>row.attendanceId),'Required daily attendance record missing');
    await row.click();
    await ctx.page.waitForURL(url=>decodeURIComponent(url.pathname).endsWith(`/attendance/${decodeURIComponent(ctx.entities.dayId!)}`));
    await shown(ctx,(await entity(ctx,'students',ctx.entities.studentId)).lastName,'[role="dialog"].ui-drawer');
  },
  'web.scenario.0122': async ctx => {
    const report = await entity(ctx,'results',ctx.entities.reportCardId);
    assert.equal(report.status,'published');
    const student = await entity(ctx,'students',report.studentId);
    await shown(ctx,student.lastName,'[role="dialog"].ui-drawer');
    await ctx.page.locator('[role="dialog"].ui-drawer').getByText(/^(publié|published)$/i).waitFor();
    assert(report.teacherComment, 'Required persisted homeroom comment missing');
    await shown(ctx,report.teacherComment,'[role="dialog"].ui-drawer');
  },
  'web.scenario.0135': async ctx => {
    const account = (await list(ctx,'student-year-accounts',{studentId:ctx.entities.studentId}))[0]!;
    const payments = await list(ctx,'payments',{accountId:account.id});
    const payment = payments[0]!;
    const row = ctx.page.locator(`[data-entity-id="${payment.id}"]`);
    await row.waitFor();
    const student = await entity(ctx,'students',account.studentId);
    assert((await row.innerText()).includes(student.lastName));
    assert((await row.innerText()).replace(/[\s\u00a0\u202f]/g,'').includes(String(payment.amount?.amount ?? payment.amount)), 'Ledger amount differs from the persisted payment');
  },
  'web.scenario.0136': async ctx => {
    const student = await entity(ctx,'students',ctx.entities.studentId);
    const account = (await list(ctx,'student-year-accounts',{studentId:student.id}))[0]!;
    const payments = await list(ctx,'payments',{accountId:account.id});
    const search = listSearchInput(ctx.page);
    await search.fill(student.lastName);
    for(const payment of payments) await ctx.page.locator(`[data-entity-id="${payment.id}"]`).waitFor();
    await search.fill(`no-payment-${crypto.randomUUID()}`);
    for(const payment of payments) await ctx.page.locator(`[data-entity-id="${payment.id}"]`).waitFor({state:'hidden'});
    await search.fill('');
  },
  'web.scenario.0164': fixtureName('report-modules','reportModuleId'),
  'web.scenario.0166': fixtureName('report-modules','reportModuleId'),
  'web.scenario.0176': async ctx => {
    for (const id of ['import-pack-generic','timetable-planning-tool']) await ctx.page.getByTestId(id).waitFor({state:'visible'});
    for (const id of ['import-action','timetable-planning-action']) {
      assert(await ctx.page.getByTestId(id).isEnabled(), `Required tool action ${id} is disabled`);
    }
  },
  'web.scenario.0178': async ctx => {
    const teacher = await entity(ctx,'teachers',ctx.entities.teacherId);
    await shown(ctx,teacher.lastName);
    const assignments = await list(ctx,'teacher-assignments',{teacherId:ctx.entities.teacherId});
    assert(assignments.some(row => row.classGroupId === ctx.entities.classId), 'Required assigned teacher/class pair missing');
    await shown(ctx,(await entity(ctx,'class-groups',ctx.entities.classId)).name);
  },
};

export async function exerciseRegisteredRead(id: string, ctx: ReadContext): Promise<string | null> {
  const scenario = READ_SCENARIOS[id];
  if (!scenario) return null;
  await scenario(ctx);
  return 'Verified persisted fixture data and the corresponding visible content';
}
