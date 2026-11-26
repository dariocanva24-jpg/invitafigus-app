import { createSessionToken, passwordMatches, readJson, sendJson, setSessionCookie } from '../lib/server/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' })

  const { password } = await readJson(req)
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return sendJson(res, 500, { error: 'ADMIN_PASSWORD no configurado en el servidor' })

  if (!passwordMatches(password, expected)) {
    return sendJson(res, 401, { error: 'Contraseña incorrecta' })
  }

  setSessionCookie(res, createSessionToken())
  return sendJson(res, 200, { ok: true })
}
