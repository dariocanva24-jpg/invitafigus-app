import crypto from 'node:crypto'

const COOKIE_NAME = 'if_admin'
const SESSION_HOURS = 8

const secret = () => process.env.SESSION_SECRET || 'dev-secret-change-me'

export function createSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({ admin: true, exp: Date.now() + SESSION_HOURS * 3600 * 1000 }),
  ).toString('base64url')
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function isAdminRequest(req) {
  const cookies = (req.headers.cookie || '').split(';').map((item) => item.trim())
  const token = cookies.find((item) => item.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1)
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return data.admin === true && data.exp > Date.now()
  } catch {
    return false
  }
}

export function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}${secure}`,
  )
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`)
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  let raw = ''
  for await (const chunk of req) raw += chunk
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

export function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

export function passwordMatches(provided, expected) {
  if (typeof provided !== 'string' || !expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
