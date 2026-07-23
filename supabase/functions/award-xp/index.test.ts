import { assertEquals, assertExists } from 'jsr:@std/assert@1'

// Module-load-time env reads (SUPABASE_URL etc.) must be set before the
// module under test is imported.
Deno.env.set('SUPABASE_URL', 'http://localhost:54321')
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key')
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

const { handler, isAwardXpRequestBody } = await import('./index.ts')

function withMockedFetch(impl: (input: string | URL | Request, init?: RequestInit) => Promise<Response>, run: () => Promise<void>) {
  const realFetch = globalThis.fetch
  globalThis.fetch = impl as typeof fetch
  return run().finally(() => {
    globalThis.fetch = realFetch
  })
}

function requestWithAuth(auth: string | null, body: Record<string, unknown> = { client_id: 'c1', activity_type_key: 'daily_checkin' }): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (auth !== null) {
    headers.set('Authorization', auth)
  }
  return new Request('http://localhost/functions/v1/award-xp', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

Deno.test('isAwardXpRequestBody accepts a minimal valid body', () => {
  assertEquals(isAwardXpRequestBody({ client_id: 'c1', activity_type_key: 'daily_checkin' }), true)
})

Deno.test('isAwardXpRequestBody accepts optional fields when well-typed', () => {
  assertEquals(
    isAwardXpRequestBody({
      client_id: 'c1',
      activity_type_key: 'daily_checkin',
      note: 'hi',
      occurred_at: '2026-01-01T00:00:00Z',
      source: 'manual',
      proof_url: 'https://example.com/p.png',
    }),
    true,
  )
})

Deno.test('isAwardXpRequestBody rejects a missing client_id', () => {
  assertEquals(isAwardXpRequestBody({ activity_type_key: 'daily_checkin' }), false)
})

Deno.test('isAwardXpRequestBody rejects an empty client_id', () => {
  assertEquals(isAwardXpRequestBody({ client_id: '', activity_type_key: 'daily_checkin' }), false)
})

Deno.test('isAwardXpRequestBody rejects an invalid source', () => {
  assertEquals(isAwardXpRequestBody({ client_id: 'c1', activity_type_key: 'daily_checkin', source: 'not-a-source' }), false)
})

Deno.test('isAwardXpRequestBody rejects non-object input', () => {
  assertEquals(isAwardXpRequestBody('nope'), false)
  assertEquals(isAwardXpRequestBody(null), false)
})

Deno.test('handler rejects a request with no Authorization header, without calling fetch', async () => {
  await withMockedFetch(
    () => {
      throw new Error('fetch should not have been called')
    },
    async () => {
      const res = await handler(requestWithAuth(null))
      assertEquals(res.status, 401)
      const body = await res.json()
      assertEquals(body.error, 'Missing Authorization header')
    },
  )
})

Deno.test('handler rejects an invalid/expired JWT', async () => {
  await withMockedFetch(
    async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/auth/v1/user')) {
        return new Response(JSON.stringify({ message: 'invalid token' }), { status: 401 })
      }
      throw new Error(`unexpected fetch to ${url}`)
    },
    async () => {
      const res = await handler(requestWithAuth('Bearer garbage'))
      assertEquals(res.status, 401)
      const body = await res.json()
      assertEquals(body.error, 'Invalid or expired session')
    },
  )
})

Deno.test('handler derives user_id from the verified token, ignoring any user_id in the body', async () => {
  const REAL_UID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const FORGED_UID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
  let rpcRequestBody: Record<string, unknown> | null = null

  await withMockedFetch(
    async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/auth/v1/user')) {
        return new Response(JSON.stringify({ id: REAL_UID, aud: 'authenticated' }), { status: 200 })
      }
      if (url.includes('/rest/v1/rpc/award_xp')) {
        rpcRequestBody = JSON.parse((init?.body as string) ?? '{}')
        return new Response(
          JSON.stringify([{ activity_id: 'x', xp_awarded: 5, capped: false, streak_freeze_used: false, total_xp: 5, current_level: 1, current_streak: 1, longest_streak: 1, xp_in_period: 5 }]),
          { status: 200 },
        )
      }
      throw new Error(`unexpected fetch to ${url}`)
    },
    async () => {
      const res = await handler(
        requestWithAuth('Bearer valid-token', {
          client_id: 'c1',
          activity_type_key: 'daily_checkin',
          // Forged fields an attacker might try to smuggle in — must be ignored.
          user_id: FORGED_UID,
          xp: 999999,
        }),
      )
      assertEquals(res.status, 200)
    },
  )

  assertExists(rpcRequestBody)
  assertEquals((rpcRequestBody as Record<string, unknown>).p_user_id, REAL_UID)
})

Deno.test('handler rejects a malformed body', async () => {
  await withMockedFetch(
    async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/auth/v1/user')) {
        return new Response(JSON.stringify({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', aud: 'authenticated' }), { status: 200 })
      }
      throw new Error(`unexpected fetch to ${url}`)
    },
    async () => {
      const res = await handler(requestWithAuth('Bearer valid-token', { activity_type_key: 'daily_checkin' }))
      assertEquals(res.status, 400)
      const body = await res.json()
      assertEquals(body.error, 'Invalid request body')
    },
  )
})

Deno.test('handler rejects non-POST methods', async () => {
  const req = new Request('http://localhost/functions/v1/award-xp', { method: 'GET' })
  const res = await handler(req)
  assertEquals(res.status, 405)
})
