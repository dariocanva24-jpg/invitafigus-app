import { readJson, sendJson } from '../lib/server/auth.js'
import { readFromSheets, writeToSheets } from '../lib/server/sheets.js'

// Endpoints públicos: solo lectura por slug y contador de vistas.
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const slug = new URL(req.url, 'http://localhost').searchParams.get('slug')
      if (!slug) return sendJson(res, 400, { error: 'Falta el slug' })
      const event = await readFromSheets('getBySlug', { slug })
      return sendJson(res, 200, event)
    }

    if (req.method === 'POST') {
      const body = await readJson(req)
      if (body.action !== 'incrementViews' || !body.slug) {
        return sendJson(res, 400, { error: 'Acción no permitida' })
      }
      const data = await writeToSheets('incrementViews', { slug: body.slug })
      return sendJson(res, 200, { views: data.views })
    }

    return sendJson(res, 405, { error: 'Método no permitido' })
  } catch (error) {
    console.error('invitations:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
