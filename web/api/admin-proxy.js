import { isAdminRequest, readJson, sendJson } from '../lib/server/auth.js'
import { readFromSheets, writeToSheets } from '../lib/server/sheets.js'

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return sendJson(res, 401, { error: 'Sesión expirada. Ingresá de nuevo.' })

  // Sin la planilla conectada el panel entra igual y avisa qué falta.
  if (!process.env.APPS_SCRIPT_URL) {
    if (req.method === 'GET') return sendJson(res, 200, { rows: [], warning: 'MISSING_APPS_SCRIPT_URL' })
    return sendJson(res, 200, { ok: false, warning: 'MISSING_APPS_SCRIPT_URL' })
  }

  try {
    if (req.method === 'GET') {
      const action = new URL(req.url, 'http://localhost').searchParams.get('action') || 'getAll'
      if (action !== 'getAll') return sendJson(res, 400, { error: 'Acción no permitida' })
      return sendJson(res, 200, await readFromSheets(action))
    }

    if (req.method === 'POST') {
      const body = await readJson(req)
      const { action, ...params } = body
      const data = await writeToSheets(action, params)
      return sendJson(res, 200, { ok: true, data })
    }

    return sendJson(res, 405, { error: 'Método no permitido' })
  } catch (error) {
    console.error('admin-proxy:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
