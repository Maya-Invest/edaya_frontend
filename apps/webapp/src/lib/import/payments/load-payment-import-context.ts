import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { PaymentImportValidationContext } from './types';
import { listCatalogServices, listStudentCharges, listYearPayments } from '$lib/api/finance-data';
import { loadStudentMatriculeIndex } from '$lib/import/shared/load-student-matricule-index';
import { normalizeImportCode } from '$lib/import/shared/normalize-import-code';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export async function loadPaymentImportContext(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<PaymentImportValidationContext> {
	const [fees, billing, payments, studentMatricules] = await Promise.all([
		listCatalogServices(client, scope),
		listStudentCharges(client, scope),
		listYearPayments(client, scope),
		loadStudentMatriculeIndex(),
	]);

	const existingReferences = new Set(
		payments
			.map(payment => payment.reference?.trim())
			.filter((reference): reference is string => Boolean(reference))
			.map(reference => normalizeImportCode(reference)),
	);

	return {
		academicYearId: scope.academicYearId,
		fees: fees.map(fee => ({ id: fee.id, name: fee.name })),
		studentFees: billing.map(entry => ({
			id: entry.id,
			studentId: entry.studentId,
			feeId: entry.catalogServiceId,
			total: entry.total,
			paid: entry.paid,
		})),
		studentMatricules,
		existingReferences,
	};
}
