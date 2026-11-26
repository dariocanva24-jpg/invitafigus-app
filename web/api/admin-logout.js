import { clearSessionCookie, sendJson } from '../lib/server/auth.js'

export default function handler(_req, res) {
  clearSessionCookie(res)
  return sendJson(res, 200, { ok: true })
}
