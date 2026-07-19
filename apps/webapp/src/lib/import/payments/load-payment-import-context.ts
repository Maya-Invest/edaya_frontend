import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadFinanceData } from '$lib/api/finance-data';
import { loadStudentMatriculeIndex } from '$lib/import/shared/load-student-matricule-index';
import type { PaymentImportValidationContext } from './types';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function loadPaymentImportContext(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<PaymentImportValidationContext> {
	const [{ fees, billing }, studentMatricules] = await Promise.all([
		loadFinanceData(client, scope),
		loadStudentMatriculeIndex(),
	]);

	return {
		fees: fees.map(fee => ({ id: fee.id, name: fee.name })),
		studentFees: billing.map(entry => ({
			id: entry.id,
			studentId: entry.studentId,
			feeId: entry.feeId,
			total: entry.total,
			paid: entry.paid,
		})),
		studentMatricules,
	};
}
