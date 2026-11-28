import { readJson, sendJson } from '../server/auth.js'
import { readFromSheets, writeToSheets } from '../server/sheets.js'
import { toE164 } from '../server/mercadopago.js'

// Confirmaciones de invitados: viven en la planilla (hoja "Confirmaciones").
// No hace falta servidor aparte ni base de datos.

const SLUG = /^[a-z0-9-]{1,120}$/i

// Estados que significan "la invitación está activa" (el pago se acreditó).
const ESTADOS_PAGADOS = ['ACTIVA', 'REEMBOLSADA', 'CONTRACARGO']

// ¿El pedido ya se pagó? Lo consulta la confirmación antes de guardar nada.
// El link se puede compartir sin pagar (se ve la figurita con marca de agua),
// pero CONFIRMAR y ver la lista de invitados es lo que se compra.
async function pedidoPagado(slug) {
  try {
    const order = await readFromSheets('getOrder', { slug })
    if (!order) return { ok: false, motivo: 'pedido_inexistente' }
    const estado = String(order.estado || '').toUpperCase()
    return { ok: ESTADOS_PAGADOS.includes(estado), motivo: estado || 'BORRADOR' }
  } catch {
    // Si la planilla no responde, no se bloquea al invitado por un error nuestro.
    return { ok: true, motivo: 'sin_verificar' }
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const slug = new URL(req.url, 'http://localhost').searchParams.get('slug') || ''
      if (!SLUG.test(slug)) return sendJson(res, 400, { error: 'Slug inválido' })
      const count = await readFromSheets('rsvpCount', { slug })
      return sendJson(res, 200, { ok: true, count: count?.count || count, messages: count?.messages || [] })
    }

    if (req.method === 'POST') {
      const body = await readJson(req)
      const { slug, name, status, guests, notes } = body
      // El formulario manda el teléfono como "whatsapp"; antes la API solo leía
      // "phone" y respondía "Faltan datos obligatorios" aunque estuviera todo
      // cargado. Se aceptan los dos nombres.
      const phone = body.phone || body.whatsapp || body.telefono || ''
      const faltan = []
      if (!slug) faltan.push('el código de la invitación')
      if (!String(name || '').trim()) faltan.push('el nombre')
      if (!String(phone || '').replace(/\D/g, '')) faltan.push('el WhatsApp')
      if (!status) faltan.push('si vas o no vas')
      if (faltan.length) {
        return sendJson(res, 400, { error: `Falta ${faltan.join(', ')}`, faltan })
      }

      // Las confirmaciones se abren cuando el organizador activa la invitación.
      const pago = await pedidoPagado(String(slug))
      if (!pago.ok) {
        return sendJson(res, 402, {
          error: 'Esta invitación todavía no está activada. El organizador tiene que confirmar el pago para abrir las confirmaciones.',
          codigo: 'SIN_PAGAR',
          estado: pago.motivo,
        })
      }
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
      return sendJson(res, 201, { ok: true, rsvp: data, count: data?.count, messages: data?.messages || [], notified: false })
    }

    return sendJson(res, 405, { error: 'Método no permitido' })
  } catch (error) {
    console.error('rsvp:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
