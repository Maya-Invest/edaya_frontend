import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { BillingImportValidationContext } from './types';
import { loadFinanceData } from '$lib/api/finance-data';
import { loadStudentMatriculeIndex } from '$lib/import/shared/load-student-matricule-index';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function loadBillingImportContext(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<BillingImportValidationContext> {
	const [{ fees, billing }, studentMatricules] = await Promise.all([
		loadFinanceData(client, scope),
		loadStudentMatriculeIndex(),
	]);

	return {
		fees: fees.map(fee => ({ id: fee.id, name: fee.name, amount: fee.amount })),
		assignedStudentFees: billing.map(entry => ({
			studentId: entry.studentId,
			feeId: entry.feeId,
		})),
		studentMatricules,
	};
}
