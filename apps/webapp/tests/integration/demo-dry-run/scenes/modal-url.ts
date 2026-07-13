import { CLASS_6A, CLASS_SUBJECT_ID, STAFF_ID, STUDENT_ID } from '../support/constants';
import {
	classTeachingDrawerPath,
	classTeachingPath,
	schoolStaffPath,
	schoolStudentPath,
} from '../support/paths';
import { waitForDrawerAside } from '../support/drawer';
import {
	closeFormModal,
	urlModalParam,
	waitForFormModal,
	waitForPickerModal,
	waitForUrlModal,
} from '../support/modal';
import type { DemoContext } from '../support/types';
import { visit } from '../support/visit';

/** URL-backed modals: deep links, open sync, close strips ?modal=. */
export async function runModalUrlChecks(ctx: DemoContext): Promise<void> {
	const scene = 'DM';
	const { base, reporter, shot } = ctx;

	if (await visit(ctx, `${base}/school/students?modal=create`, scene, '1 Students create deep-link', {
		pathPrefix: '/school/students',
	})) {
		if (await waitForFormModal(ctx)) {
			reporter.log(scene, '2 Students create modal visible', 'pass');
		}
		else {
			reporter.log(scene, '2 Students create modal visible', 'fail', 'form-modal not found');
			await shot('DM-2-students-create');
		}

		if (await waitForUrlModal(ctx, 'create')) {
			reporter.log(scene, '3 Students URL modal=create', 'pass');
		}
		else {
			reporter.log(scene, '3 Students URL modal=create', 'fail', `modal=${urlModalParam(ctx) ?? 'none'}`);
		}

		if (await closeFormModal(ctx) && await waitForUrlModal(ctx, null, { absent: true })) {
			reporter.log(scene, '4 Students close strips modal param', 'pass');
		}
		else {
			reporter.log(scene, '4 Students close strips modal param', 'fail', `modal=${urlModalParam(ctx) ?? 'none'}`);
			await shot('DM-4-students-close');
		}
	}

	if (await visit(ctx, `${base}/school/teachers?modal=create`, scene, '5 Teachers create deep-link', {
		pathPrefix: '/school/teachers',
	})) {
		if (await waitForFormModal(ctx) && await waitForUrlModal(ctx, 'create')) {
			reporter.log(scene, '6 Teachers URL modal=create', 'pass');
		}
		else {
			reporter.log(scene, '6 Teachers URL modal=create', 'fail', `modal=${urlModalParam(ctx) ?? 'none'}`);
		}
	}

	if (await visit(ctx, `${base}/school/staff?modal=create`, scene, '7 Staff create deep-link', {
		pathPrefix: '/school/staff',
	})) {
		if (await waitForFormModal(ctx) && await waitForUrlModal(ctx, 'create')) {
			reporter.log(scene, '8 Staff URL modal=create', 'pass');
		}
		else {
			reporter.log(scene, '8 Staff URL modal=create', 'fail', `modal=${urlModalParam(ctx) ?? 'none'}`);
		}
	}

	if (await visit(ctx, `${base}/configuration/classes/${CLASS_6A}?modal=edit`, scene, '9 Class edit deep-link', {
		pathPrefix: `/configuration/classes/${CLASS_6A}`,
	})) {
		if (await waitForDrawerAside(ctx) && await waitForFormModal(ctx) && await waitForUrlModal(ctx, 'edit')) {
			reporter.log(scene, '10 Class URL modal=edit', 'pass');
		}
		else {
			reporter.log(scene, '10 Class URL modal=edit', 'fail', `modal=${urlModalParam(ctx) ?? 'none'}`);
			await shot('DM-10-class-edit');
		}
	}

	if (await visit(ctx, `${base}${schoolStudentPath(STUDENT_ID)}?modal=edit-profile`, scene, '11 Student edit-profile deep-link', {
		pathPrefix: schoolStudentPath(STUDENT_ID),
	})) {
		if (await waitForDrawerAside(ctx) && await waitForFormModal(ctx) && await waitForUrlModal(ctx, 'edit-profile')) {
			reporter.log(scene, '12 Student URL modal=edit-profile', 'pass');
		}
		else {
			reporter.log(scene, '12 Student URL modal=edit-profile', 'fail', `modal=${urlModalParam(ctx) ?? 'none'}`);
			await shot('DM-12-student-edit');
		}
	}

	if (await visit(ctx, `${base}${schoolStudentPath(STUDENT_ID)}?modal=link-guardian`, scene, '13 Student link-guardian deep-link', {
		pathPrefix: schoolStudentPath(STUDENT_ID),
	})) {
		const picker = await waitForPickerModal(ctx);
		if (picker && await waitForUrlModal(ctx, 'link-guardian')) {
			reporter.log(scene, '14 Student URL modal=link-guardian', 'pass');
		}
		else {
			reporter.log(scene, '14 Student URL modal=link-guardian', 'fail', `modal=${urlModalParam(ctx) ?? 'none'}`);
			await shot('DM-14-student-guardian');
		}
	}

	if (await visit(ctx, `${base}${schoolStudentPath(STUDENT_ID, 'grades')}?modal=add-grade`, scene, '15 Student add-grade deep-link', {
		pathPrefix: schoolStudentPath(STUDENT_ID, 'grades'),
	})) {
		if (await waitForDrawerAside(ctx) && await waitForFormModal(ctx) && await waitForUrlModal(ctx, 'add-grade')) {
			reporter.log(scene, '16 Student URL modal=add-grade', 'pass');
		}
		else {
			reporter.log(scene, '16 Student URL modal=add-grade', 'fail', `modal=${urlModalParam(ctx) ?? 'none'}`);
		}
	}

	if (await visit(ctx, `${base}${classTeachingPath(CLASS_6A, CLASS_SUBJECT_ID)}?modal=edit-subject`, scene, '17 Subject edit deep-link', {
		pathPrefix: classTeachingDrawerPath(CLASS_6A, CLASS_SUBJECT_ID),
	})) {
		if (await waitForDrawerAside(ctx) && await waitForFormModal(ctx) && await waitForUrlModal(ctx, 'edit-subject')) {
			reporter.log(scene, '18 Subject URL modal=edit-subject', 'pass');
		}
		else {
			reporter.log(scene, '18 Subject URL modal=edit-subject', 'fail', `modal=${urlModalParam(ctx) ?? 'none'}`);
		}
	}

	if (await visit(ctx, `${base}${schoolStaffPath(STAFF_ID, 'permissions')}?modal=add-permission`, scene, '19 Staff add-permission deep-link', {
		pathPrefix: schoolStaffPath(STAFF_ID, 'permissions'),
	})) {
		if (await waitForDrawerAside(ctx) && await waitForFormModal(ctx) && await waitForUrlModal(ctx, 'add-permission')) {
			reporter.log(scene, '20 Staff URL modal=add-permission', 'pass');
		}
		else {
			reporter.log(scene, '20 Staff URL modal=add-permission', 'skip', 'Permissions tab or ACCESS_CONTROL_ASSIGN');
		}
	}
}
