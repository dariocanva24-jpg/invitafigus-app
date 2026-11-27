import { readJson, sendJson } from '../lib/server/auth.js'
import { readFromSheets, writeToSheets } from '../lib/server/sheets.js'
import { toE164 } from '../lib/server/mercadopago.js'
import { PRICE_BASE, PRICE_COMPLETE, amountForPlan } from '../lib/server/pricing.js'

// Estado del pedido para el cliente (polling de la pantalla de pago).
// Nunca devuelve datos sensibles: solo estado, plan y monto.

const SLUG = /^[a-z0-9-]{3,120}$/i

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const slug = new URL(req.url, 'http://localhost').searchParams.get('slug') || ''
      if (!SLUG.test(slug)) return sendJson(res, 400, { error: 'Código inválido' })
      const order = await readFromSheets('getOrder', { slug })
      return sendJson(res, 200, { order })
    }

    if (req.method === 'POST') {
      const body = await readJson(req)

      if (body.action === 'quote') {
        const plan = body.plan === 'completo' ? 'completo' : 'base'
        return sendJson(res, 200, { plan, total: amountForPlan(plan), base: PRICE_BASE, completo: PRICE_COMPLETE })
      }

      // Normaliza el teléfono antes de guardarlo (E.164).
      if (body.action === 'normalizePhone') {
        return sendJson(res, 200, { phone: toE164(body.phone) })
      }

      return sendJson(res, 400, { error: 'Acción desconocida' })
    }

    return sendJson(res, 405, { error: 'Método no permitido' })
  } catch (error) {
    console.error('order:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}
