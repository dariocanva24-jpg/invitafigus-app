import { readJson, sendJson } from '../server/auth.js'
import { readFromSheets, writeToSheets } from '../server/sheets.js'

// Panel del organizador respaldado por la planilla (columna "clave").
const SLUG = /^[a-z0-9-]{3,120}$/i

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' })
    const body = await readJson(req)
    const { action } = body
    const code = String(body.code || '')
    if (!SLUG.test(code)) return sendJson(res, 400, { error: 'Código inválido' })

    if (action === 'issue') {
      const data = await readFromSheets('panelIssue', { slug: code })
      return sendJson(res, 200, { code: data?.code || code, key: data?.key || '' })
    }

    if (action === 'summary') {
      const key = String(body.key || '')
      if (!key) return sendJson(res, 400, { error: 'Falta la clave del panel' })
      const data = await readFromSheets('panelSummary', { slug: code, key })
      return sendJson(res, 200, data)
    }

    return sendJson(res, 400, { error: 'Acción desconocida' })
  } catch (error) {
    console.error('panel:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
