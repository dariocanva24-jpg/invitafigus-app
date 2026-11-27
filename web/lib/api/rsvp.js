import { readJson, sendJson } from '../server/auth.js'
import { readFromSheets, writeToSheets } from '../server/sheets.js'
import { toE164 } from '../server/mercadopago.js'

// Confirmaciones de invitados: viven en la planilla (hoja "Confirmaciones").
// No hace falta servidor aparte ni base de datos.

const SLUG = /^[a-z0-9-]{1,120}$/i

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const slug = new URL(req.url, 'http://localhost').searchParams.get('slug') || ''
      if (!SLUG.test(slug)) return sendJson(res, 400, { error: 'Slug inválido' })
      const count = await readFromSheets('rsvpCount', { slug })
      return sendJson(res, 200, { ok: true, count })
    }

    if (req.method === 'POST') {
      const body = await readJson(req)
      const { slug, name, phone, status, guests, notes } = body
      if (!slug || !name || !phone || !status) return sendJson(res, 400, { error: 'Faltan datos obligatorios' })
      if (!SLUG.test(String(slug))) return sendJson(res, 400, { error: 'Slug inválido' })
      if (!['confirmed', 'declined'].includes(status)) return sendJson(res, 400, { error: 'Estado inválido' })
      const data = await writeToSheets('addRSVP', {
        slug,
        nombre: String(name).slice(0, 80),
        telefono: toE164(phone).slice(0, 25),
        estado: status,
        acompanantes: Number(guests) || 0,
        notas: String(notes || '').slice(0, 300),
        email: String(body.email || '').slice(0, 120),
        consent_marketing: body.consent_marketing ? 'true' : 'false',
        consent_source: body.consent_marketing ? 'rsvp' : '',
      })
      return sendJson(res, 201, { ok: true, rsvp: data, count: data?.count, notified: false })
    }

    return sendJson(res, 405, { error: 'Método no permitido' })
  } catch (error) {
    console.error('rsvp:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
