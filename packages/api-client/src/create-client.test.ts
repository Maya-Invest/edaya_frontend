import type { Transport, TransportRequestOptions } from './transport'
import { describe, expect, test } from 'bun:test'
import { createSchoolClient } from './generated/create-client'

interface RequestRecord {
  method: string
  path: string
  options?: TransportRequestOptions
}

type TestSchemas = Record<string, unknown> & {
  Subject: { id: string, name: string }
  Student: { id: string }
  RegisterStudentCommand: { schoolId: string, firstName: string, lastName: string }
  StudentRegistrationResponse: { studentId: string }
  GetOverdueFeeCountQuery: { schoolId: string }
  CountResponse: { count: number }
  EffectiveGrantsResponse: { grants: string[] }
}

function createRecordingTransport(responses: unknown[]): {
  requests: RequestRecord[]
  transport: Transport
} {
  const requests: RequestRecord[] = []
  return {
    requests,
    transport: {
      async request<T>(method: string, path: string, options?: TransportRequestOptions): Promise<T> {
        requests.push({ method, path, options })
        return responses.shift() as T
      },
    },
  }
}

describe('createSchoolClient', () => {
  test('uses generated entity paths and unwraps entity envelopes', async () => {
    const { requests, transport } = createRecordingTransport([
      [{ data: { id: 'subject-1', name: 'Mathematics' } }],
      { data: { id: 'subject-1', name: 'Mathematics' } },
      { message: 'deleted' },
    ])
    const client = createSchoolClient<TestSchemas>(transport)

    await expect(client.entities.subjects.list({ schoolId: 'school-1' })).resolves.toEqual([
      { id: 'subject-1', name: 'Mathematics' },
    ])
    await expect(client.entities.subjects.save({ id: 'subject-1', name: 'Mathematics' })).resolves.toEqual({
      id: 'subject-1',
      name: 'Mathematics',
    })
    await expect(client.entities.students.delete({ id: 'student-1' })).resolves.toEqual({ message: 'deleted' })

    expect(requests).toEqual([
      {
        method: 'POST',
        path: '/core/entities/subjects/list',
        options: { body: { schoolId: 'school-1' } },
      },
      {
        method: 'POST',
        path: '/core/entities/subjects/save',
        options: { body: { id: 'subject-1', name: 'Mathematics' } },
      },
      {
        method: 'POST',
        path: '/core/entities/students/delete',
        options: { body: { id: 'student-1' } },
      },
    ])
  })

  test('uses generated command, query, and authorization paths', async () => {
    const { requests, transport } = createRecordingTransport([
      { studentId: 'student-1' },
      { count: 2 },
      { grants: ['students:read'] },
    ])
    const client = createSchoolClient<TestSchemas>(transport)

    await client.commands.registerStudent({
      schoolId: 'school-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
    await client.queries.getOverdueFeeCount({ schoolId: 'school-1' })
    await client.authorization.effectiveGrants()

    expect(requests).toEqual([
      {
        method: 'POST',
        path: '/core/commands/register-student',
        options: { body: { schoolId: 'school-1', firstName: 'Ada', lastName: 'Lovelace' } },
      },
      {
        method: 'POST',
        path: '/core/queries/get-overdue-fee-count',
        options: { body: { schoolId: 'school-1' } },
      },
      {
        method: 'GET',
        path: '/core/authorization/effective-grants',
        options: undefined,
      },
    ])
  })
})
