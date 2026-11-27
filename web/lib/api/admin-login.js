import { createSessionToken, passwordMatches, readJson, sendJson, setSessionCookie } from '../server/auth.js'

// GET sirve para diagnosticar el panel: dice qué configuración falta,
// sin revelar nunca los valores.
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const missing = []
    if (!process.env.ADMIN_PASSWORD) missing.push('ADMIN_PASSWORD')
    if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET')
    if (!process.env.APPS_SCRIPT_URL) missing.push('APPS_SCRIPT_URL')
    // API_BASE_URL / API_TOKEN son OPCIONALES: las confirmaciones y el panel
    // funcionan con la planilla, sin servidor extra.

    return sendJson(res, 200, { ready: missing.length === 0, missing })
  }

  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' })

  const { password } = await readJson(req)
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    return sendJson(res, 500, {
      error: 'Falta la variable ADMIN_PASSWORD en Vercel (proyecto web) → Settings → Environment Variables, y después Redeploy.',
      code: 'MISSING_ADMIN_PASSWORD',
    })
  }

  if (!passwordMatches(password, expected)) {
    return sendJson(res, 401, { error: 'Contraseña incorrecta', code: 'WRONG_PASSWORD' })
  }

  if (!process.env.SESSION_SECRET) {
    return sendJson(res, 500, {
      error: 'Falta la variable SESSION_SECRET en Vercel (proyecto web). Cargala y volvé a desplegar.',
      code: 'MISSING_SESSION_SECRET',
    })
  }
  // APPS_SCRIPT_URL NO bloquea el ingreso: sin ella entrás al panel igual,
  // solo que la lista de la planilla aparece vacía hasta que la cargues.
  setSessionCookie(res, createSessionToken())
  return sendJson(res, 200, { ok: true, warning: process.env.APPS_SCRIPT_URL ? null : 'MISSING_APPS_SCRIPT_URL' })
}
