import { readJson, sendJson } from '../server/auth.js'
import { writeToSheets, readFromSheets } from '../server/sheets.js'
import { createPreference, isMpConfigured, mpConfig, toE164 } from '../server/mercadopago.js'
import { amountForPlan, planForAmount } from '../server/pricing.js'

// POST /api/checkout/preference
// Crea (o reutiliza) la preferencia de Checkout Pro para un pedido.
//
// Reglas:
//  - El MONTO lo decide el servidor a partir del plan. El cliente no lo manda.
//  - Una sola transacción: si hay bump, es UN ítem de 14.999.
//  - Idempotencia: si el pedido ya tiene preferencia, se devuelve la misma.

const SLUG = /^[a-z0-9-]{3,120}$/i
const ORDER_ID = /^[a-zA-Z0-9_-]{6,80}$/

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido' })
  if (!isMpConfigured()) {
    return sendJson(res, 503, {
      error: 'Mercado Pago no está configurado todavía',
      code: 'MP_NOT_CONFIGURED',
    })
  }

  try {
    const body = await readJson(req)
    const slug = String(body.slug || '')
    if (!SLUG.test(slug)) return sendJson(res, 400, { error: 'Código de pedido inválido' })

    // El plan (no el monto) es lo único que viene del cliente.
    const plan = body.plan === 'completo' ? 'completo' : 'base'
    const amount = amountForPlan(plan)

    // 1) ¿El pedido existe y ya tiene preferencia? → reutilizarla.
    let order = null
    try {
      order = await readFromSheets('getOrder', { slug })
    } catch {
      order = null
    }
    if (order?.estado === 'ACTIVA') {
      return sendJson(res, 200, { alreadyPaid: true, slug, initPoint: null })
    }
    if (order?.preference_id && order?.plan === plan) {
      const cached = await readPreference(order.preference_id).catch(() => null)
      if (cached?.init_point) {
        return sendJson(res, 200, {
          slug,
          orderId: order.order_id,
          preferenceId: order.preference_id,
          initPoint: cached.init_point,
          sandboxInitPoint: cached.sandbox_init_point || null,
          total: amount,
          plan,
          reused: true,
        })
      }
    }

    // 2) order_id estable por pedido+plan: sirve de external_reference.
    const orderId = `IF-${slug}-${plan}`.slice(0, 80).replace(/[^a-zA-Z0-9_-]/g, '-')
    if (!ORDER_ID.test(orderId)) return sendJson(res, 400, { error: 'order_id inválido' })

    const appUrl = mpConfig().appUrl || body.baseUrl || ''
    const preference = await createPreference({
      orderId,
      plan,
      slug,
      payerEmail: String(body.email || '').trim().slice(0, 120) || undefined,
      payerName: String(body.childName || '').trim().slice(0, 60) || undefined,
      appUrl,
    })

    // 3) Guardar en la planilla (plan + monto + preference_id). El estado sigue PENDIENTE.
    try {
      await writeToSheets('setPreference', {
        slug,
        order_id: orderId,
        plan,
        monto: amount,
        preference_id: preference.id,
      })
    } catch (error) {
      // Si la planilla falla, NO se le cobra al cliente una preferencia huérfana:
      // se avisa y se corta para poder reintentar.
      console.error('setPreference:', error.message)
      return sendJson(res, 502, { error: 'No se pudo registrar el pedido antes de cobrar' })
    }

    return sendJson(res, 201, {
      slug,
      orderId,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point || null,
      total: amount,
      plan,
      reused: false,
    })
  } catch (error) {
    console.error('checkout/preference:', error.message)
    return sendJson(res, 502, { error: error.message })
  }
}

// Lee una preferencia existente para poder reutilizarla (idempotencia).
async function readPreference(preferenceId) {
  const { accessToken } = mpConfig()
  const apiBase = process.env.MP_API_BASE || 'https://api.mercadopago.com'
  const response = await fetch(`${apiBase}/checkout/preferences/${encodeURIComponent(preferenceId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  const data = await response.json()
  return { init_point: data.init_point, sandbox_init_point: data.sandbox_init_point }
}

export { planForAmount, toE164 }
