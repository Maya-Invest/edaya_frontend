import type { SchoolClient } from './create-client.ts'

type TestSchemas = Record<string, unknown> & {
  Payment: { id: string }
  Student: { id: string }
  Subject: { id: string }
}

function assertEntityResourceTypes(client: SchoolClient<TestSchemas>): void {
  client.entities.subjects.save({ id: 'subject-1' })
  client.entities.subjects.batchSave({ entities: [{ id: 'subject-1' }] })

  client.entities.students.delete({ id: 'student-1' })
  client.entities.students.batchDelete({ ids: ['student-1'] })

  // @ts-expect-error Command-only resources do not expose direct save.
  client.entities.students.save({ id: 'student-1' })
  // @ts-expect-error Command-only resources do not expose direct batch save.
  client.entities.students.batchSave({ entities: [{ id: 'student-1' }] })
  // @ts-expect-error Payment writes must use the record-payment command.
  client.entities.payments.save({ id: 'payment-1' })
}

void assertEntityResourceTypes
