import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_SOURCES = ['manual', 'gmail', 'calendar', 'linkedin']
// Light guard against malformed/abusive payloads. The real anti-cheat
// mechanism is award_xp's server-computed XP + per-activity-type daily
// caps — this just rejects obviously-bad input before it reaches the DB.
// A proper rate limiter (sliding window per user, e.g. against a small
// table or an external store) is deferred; caps already bound how much
// damage a single user's rapid-fire calls could do per day.
const MAX_STRING_LENGTH = 2000

type AwardXpRequestBody = {
  client_id: string
  activity_type_key: string
  note?: string
  occurred_at?: string
  source?: 'manual' | 'gmail' | 'calendar' | 'linkedin'
  proof_url?: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_STRING_LENGTH
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= MAX_STRING_LENGTH)
}

function isAwardXpRequestBody(value: unknown): value is AwardXpRequestBody {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const body = value as Record<string, unknown>

  return (
    isNonEmptyString(body.client_id) &&
    isNonEmptyString(body.activity_type_key) &&
    isOptionalString(body.note) &&
    isOptionalString(body.occurred_at) &&
    isOptionalString(body.proof_url) &&
    (body.source === undefined || VALID_SOURCES.includes(body.source as string))
  )
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401)
  }

  // Anon-key client scoped to the caller's own JWT — used only to verify
  // identity via getUser(). Never used for the privileged write below.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData.user) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!isAwardXpRequestBody(body)) {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  // Anti-forgery boundary: user_id comes ONLY from the verified JWT above,
  // never the body. award_xp computes XP entirely server-side from
  // activity_types.base_xp — nothing in this body can influence the
  // amount awarded, only which activity was logged and when.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await adminClient.rpc('award_xp', {
    p_user_id: userData.user.id,
    p_client_id: body.client_id,
    p_activity_type_key: body.activity_type_key,
    p_occurred_at: body.occurred_at ?? new Date().toISOString(),
    p_note: body.note ?? null,
    p_source: body.source ?? 'manual',
    p_proof_url: body.proof_url ?? null,
  })

  if (error) {
    return jsonResponse({ error: error.message }, 400)
  }

  return jsonResponse(data?.[0] ?? null, 200)
}

export { isAwardXpRequestBody }

// Guarded so importing this module for tests doesn't also bind a real
// port as a side effect.
if (import.meta.main) {
  Deno.serve(handler)
}
