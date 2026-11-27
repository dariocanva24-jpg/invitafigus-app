import { readFromSheets, writeToSheetsWithRetry } from './sheets.js'
import { getPayment, mpConfig, isMpConfigured } from './mercadopago.js'
import { isAllowedAmount, planForAmount } from './pricing.js'

// ───────────────────────────────────────────────────────────────────────────
// Reconciliación: busca pagos aprobados en Mercado Pago que por algún motivo
// no llegaron a activar el pedido (webhook caído, secreto mal configurado,
// deploy en el medio). Consulta MP por external_reference y activa.
//
// Es idempotente: correrlo dos veces no duplica nada.
// ───────────────────────────────────────────────────────────────────────────

const API = () => process.env.MP_API_BASE || 'https://api.mercadopago.com'

async function searchPaymentsByReference(orderId) {
  const { accessToken } = mpConfig()
  const url = `${API()}/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || `Consulta rechazada (${response.status})`)
  return Array.isArray(data.results) ? data.results : []
}

export async function reconcilePendingOrders({ limit = 25 } = {}) {
  if (!isMpConfigured()) {
    return { ok: false, error: 'Mercado Pago no está configurado (falta MP_ACCESS_TOKEN)', revisados: 0, activados: [], detalles: [] }
  }

  const audit = await readFromSheets('getAudit')
  const orders = Array.isArray(audit?.orders) ? audit.orders : []

  // Solo pedidos pendientes que llegaron a tener una preferencia creada.
  const pending = orders
    .filter((order) => ['PENDIENTE', 'pending', ''].includes(String(order.estado || '').toUpperCase()) || !order.estado)
    .filter((order) => order.order_id)
    .slice(0, limit)

  const activados = []
  const detalles = []

  for (const order of pending) {
    try {
      const results = await searchPaymentsByReference(order.order_id)
      const approved = results.find((payment) => payment.status === 'approved')

      if (!approved) {
        detalles.push({ slug: order.slug, order_id: order.order_id, resultado: 'sin_pago_aprobado' })
        continue
      }

      if (!isAllowedAmount(approved.transaction_amount)) {
        detalles.push({
          slug: order.slug,
          order_id: order.order_id,
          resultado: 'monto_invalido',
          detalle: String(approved.transaction_amount),
        })
        continue
      }

      // Releer el pago puntual: la búsqueda puede traer datos viejos.
      const payment = await getPayment(approved.id)
      if (payment.status !== 'approved') {
        detalles.push({ slug: order.slug, order_id: order.order_id, resultado: `estado_${payment.status}` })
        continue
      }

      await writeToSheetsWithRetry('activateOrder', {
        order_id: order.order_id,
        slug: order.slug,
        payment_id: payment.id,
      })

      await writeToSheetsWithRetry('logWebhook', {
        payment_id: payment.id,
        order_id: order.order_id,
        status: payment.status,
        monto: payment.transaction_amount,
        firma_ok: 'RECONCILIACION',
        monto_ok: 'SI',
        resultado: 'activada',
        detalle: `reconciliación manual · plan=${planForAmount(payment.transaction_amount)}`,
      })

      activados.push({
        slug: order.slug,
        order_id: order.order_id,
        payment_id: payment.id,
        monto: payment.transaction_amount,
      })
    } catch (error) {
      detalles.push({ slug: order.slug, order_id: order.order_id, resultado: 'error', detalle: error.message })
    }
  }

  return {
    ok: true,
    revisados: pending.length,
    activados,
    detalles,
  }
}
